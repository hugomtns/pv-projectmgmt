import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { projectEquipment, type ProjectedEquipment } from '@/lib/equipmentProjection';
import { Grid, Sky } from '@react-three/drei';
import { CameraControls } from './CameraControls';
import type { CameraControlsRef } from './CameraControls';
import { ViewportToolbar, type LayerVisibility } from './ViewportToolbar';
import { SatelliteGround } from './SatelliteGround';
import { PVLayoutRenderer } from './PVLayoutRenderer';
import { ElementCommentDialog } from './ElementCommentDialog';
import { parseDXFFromURL } from '@/lib/dxf/parser';
import { getElementPosition } from './cameraUtils';
import type { DXFParsedData, DXFGeoData, PanelGeometry } from '@/lib/dxf/types';
import type { GPSCoordinates, ElementAnchor } from '@/lib/types';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';
import { Loader2 } from 'lucide-react';

/**
 * Compute a unit sun direction vector from hour-of-day (6–18).
 * Elevation peaks at solar noon (12:00) and reaches the horizon at ~6:00/18:00.
 * The azimuth sweeps from south-east at dawn to south-west at dusk.
 */
function computeSunPosition(hour: number): THREE.Vector3 {
  // phi: polar angle from zenith (0 = directly overhead, π/2 = horizon)
  const phi = THREE.MathUtils.degToRad(Math.abs(hour - 12) * 15);
  const theta = THREE.MathUtils.degToRad(180 - (hour - 12) * 10); // gentle east-west sweep
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

/**
 * Configure ACES filmic tone mapping — must run inside <Canvas> to access useThree.
 * Matches the HTML mock: ACESFilmicToneMapping at exposure 0.7 for visible sun disc
 * and warm horizon colours at sunrise/sunset.
 */
function RendererSetup() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.7;
  }, [gl]);
  return null;
}

/** Groups to hide when capturing a clean scene for AI image generation */
const AI_CAPTURE_HIDDEN_GROUPS = [
  'electrical-cables',
  'boundary-lines',
  'comment-markers',
  'equipment-overlays',
];

/**
 * CanvasCaptureProvider - Internal component to capture canvas and project equipment.
 * Must be used inside a Canvas component to access useThree()
 */
function CanvasCaptureProvider({
  captureRef,
  cameraRef,
}: {
  captureRef: MutableRefObject<((options?: { forAI?: boolean }) => string) | null>;
  cameraRef: MutableRefObject<THREE.Camera | null>;
}) {
  const { gl, scene, camera } = useThree();

  // Keep cameraRef pointing at the live Three.js camera object.
  // The camera object is mutated in-place as the user pans/zooms, so any
  // code that reads cameraRef.current later always gets the current state.
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera, cameraRef]);

  useEffect(() => {
    captureRef.current = (options) => {
      const hidden: THREE.Object3D[] = [];

      // For AI capture: hide cables, boundaries, comment markers, overlays
      // so the model sees only physical objects (panels, equipment boxes, trees)
      if (options?.forAI) {
        scene.traverse((obj) => {
          if (AI_CAPTURE_HIDDEN_GROUPS.includes(obj.name) && obj.visible) {
            obj.visible = false;
            hidden.push(obj);
          }
        });
      }

      // Render and capture
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png');

      // Restore hidden groups
      for (const obj of hidden) {
        obj.visible = true;
      }

      return dataUrl.split(',')[1];
    };
  }, [gl, scene, camera, captureRef]);

  return null;
}

export interface PV3DCanvasRef {
  focusOnElement: (elementType: string, elementId: string) => void;
  captureCanvas: (options?: { forAI?: boolean }) => string;
  /** Returns projected equipment positions in normalised 0-1 screen coordinates. */
  getEquipmentPositions: () => ProjectedEquipment[];
  cameraMode: '3d' | '2d';
  parsedData: DXFParsedData | null;
}

export interface EquipmentCounts {
  inverterCount: number;
  transformerCount: number;
  panelCount: number;
}

interface PV3DCanvasProps {
  designId: string;
  versionId: string;
  fileUrl?: string; // Optional - not needed if parsedDataOverride is provided
  gpsCoordinates?: GPSCoordinates;
  groundSizeMeters?: number;
  highlightedElementKey?: string | null;
  onBadgeClick?: (elementType: string, elementId: string) => void;
  onGeoDataExtracted?: (geoData: DXFGeoData) => void;
  onEquipmentDetected?: (counts: EquipmentCounts) => void;
  // Digital Twin
  digitalTwinActive?: boolean;
  // Pre-parsed data (for generated layouts - bypasses DXF parsing)
  parsedDataOverride?: DXFParsedData;
}

type CameraMode = '3d' | '2d';

/**
 * PV3DCanvas - Main WebGL canvas for 3D PV layout visualization
 * Uses React Three Fiber for declarative 3D rendering
 */
export const PV3DCanvas = forwardRef<PV3DCanvasRef, PV3DCanvasProps>(function PV3DCanvas({
  designId,
  versionId,
  fileUrl,
  gpsCoordinates,
  groundSizeMeters,
  highlightedElementKey,
  onBadgeClick,
  onGeoDataExtracted,
  onEquipmentDetected,
  digitalTwinActive = false,
  parsedDataOverride,
}, ref) {
  const [cameraMode, setCameraMode] = useState<CameraMode>('3d');
  // Shared zoom level between modes (default 8 for good initial view with orthographic)
  const zoomRef = useRef(8);
  const cameraControlsRef = useRef<CameraControlsRef>(null);
  // Canvas capture function ref (populated by CanvasCaptureProvider inside Canvas)
  const captureRef = useRef<((options?: { forAI?: boolean }) => string) | null>(null);
  // Live Three.js camera ref (populated by CanvasCaptureProvider inside Canvas)
  const cameraRef = useRef<THREE.Camera | null>(null);

  // DXF parsing state
  const [parsedData, setParsedData] = useState<DXFParsedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState<number | null>(null);

  // Element comment mode state
  const [elementCommentMode, setElementCommentMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementAnchor | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [showPins, setShowPins] = useState(true);

  // Layer visibility state
  const [visibility, setVisibility] = useState<LayerVisibility>({
    panels: true,
    boundaries: true,
    electrical: true,
    trees: true,
    digitalTwinMetrics: true,
    performanceHeatmap: true,
  });

  // Sun position (hour of day, 6 = sunrise, 12 = noon, 18 = sunset)
  const [sunTime, setSunTime] = useState(10.5);
  const sunPos = useMemo(() => computeSunPosition(sunTime), [sunTime]);
  // Dim the sun as it approaches the horizon (phi = 0 at noon, π/2 at horizon)
  const sunIntensity = useMemo(() => {
    const phi = THREE.MathUtils.degToRad(Math.abs(sunTime - 12) * 15);
    return Math.max(0, Math.cos(phi)) * 2.0 + 0.3;
  }, [sunTime]);

  // Digital Twin telemetry
  const telemetry = useDigitalTwinStore((state) => state.currentSnapshot);

  // Use parsedDataOverride if provided (for generated layouts)
  useEffect(() => {
    if (parsedDataOverride) {
      setParsedData(parsedDataOverride);
      setLoading(false);
      setError(null);
      console.log('Using parsed data override:', parsedDataOverride.panels.length, 'panels');
    }
  }, [parsedDataOverride]);

  // Load and parse DXF file when URL changes (skip if parsedDataOverride is provided)
  useEffect(() => {
    if (!fileUrl || parsedDataOverride) return;

    let cancelled = false;

    const loadDXF = async () => {
      setLoading(true);
      setError(null);
      setParsedData(null);

      try {
        const data = await parseDXFFromURL(fileUrl);
        if (!cancelled) {
          setParsedData(data);
          console.log('DXF parsed:', data.panels.length, 'panels,', data.electrical.length, 'electrical');
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to parse DXF file';
          setError(message);
          console.error('DXF parsing error:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDXF();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, parsedDataOverride]);

  // Notify parent when geo data is extracted from DXF (for auto-loading satellite imagery)
  useEffect(() => {
    if (parsedData?.geoData && !gpsCoordinates && onGeoDataExtracted) {
      onGeoDataExtracted(parsedData.geoData);
    }
  }, [parsedData?.geoData, gpsCoordinates, onGeoDataExtracted]);

  // Notify parent of equipment counts from parsed DXF (for Digital Twin simulation)
  useEffect(() => {
    if (parsedData && onEquipmentDetected) {
      const inverterCount = parsedData.electrical.filter(e => e.type === 'inverter').length;
      const transformerCount = parsedData.electrical.filter(e => e.type === 'transformer').length;
      onEquipmentDetected({
        inverterCount: inverterCount || 1, // At least 1 for simulation
        transformerCount: transformerCount || 1,
        panelCount: parsedData.panels.length || 100,
      });
    }
  }, [parsedData, onEquipmentDetected]);

  // Handle panel selection (for non-comment mode)
  const handlePanelClick = (index: number, panel: PanelGeometry) => {
    if (elementCommentMode) return; // Don't handle regular selection in comment mode
    setSelectedPanelIndex(index === selectedPanelIndex ? null : index);
    console.log('Panel selected:', index, panel);
  };

  // Handle element selection for commenting
  const handleElementSelected = useCallback((element: ElementAnchor) => {
    console.log('Element selected for comment:', element);
    setSelectedElement(element);
    setCommentDialogOpen(true);
    setElementCommentMode(false); // Exit comment mode after selection
  }, []);

  // Handle escape key to cancel comment mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && elementCommentMode) {
        setElementCommentMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [elementCommentMode]);

  // Handle comment dialog close
  const handleCommentDialogClose = useCallback(() => {
    setCommentDialogOpen(false);
    setSelectedElement(null);
  }, []);

  // Calculate center offset (same as PVLayoutRenderer)
  const centerOffset = useMemo(() => {
    if (!parsedData) return { x: 0, z: 0 };
    return {
      x: -parsedData.bounds.center[0],
      z: parsedData.bounds.center[1], // Flip Y to Z
    };
  }, [parsedData]);

  // Handle jump to element - focus camera on element position
  const focusOnElement = useCallback((elementType: string, elementId: string) => {
    if (!parsedData) return;

    const position = getElementPosition(
      elementType,
      elementId,
      parsedData.panels,
      parsedData.electrical,
      centerOffset
    );

    if (position) {
      cameraControlsRef.current?.focusOn(position);
    }
  }, [parsedData, centerOffset]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focusOnElement,
    captureCanvas: (options?: { forAI?: boolean }) => captureRef.current?.(options) ?? '',
    getEquipmentPositions: () => {
      if (!parsedData || !cameraRef.current) return [];
      // Ensure camera matrices are current before projecting
      cameraRef.current.updateMatrixWorld();
      return projectEquipment(parsedData, cameraRef.current);
    },
    cameraMode,
    parsedData,
  }), [focusOnElement, cameraMode, parsedData]);

  // Use designId and versionId for tracking
  console.log('PV3DCanvas loaded:', { designId, versionId });

  return (
    <div className="w-full h-full relative">
      {/* Viewport toolbar overlay */}
      <ViewportToolbar
        mode={cameraMode}
        onModeChange={setCameraMode}
        elementCommentMode={elementCommentMode}
        onElementCommentModeChange={setElementCommentMode}
        showPins={showPins}
        onShowPinsChange={setShowPins}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        digitalTwinActive={digitalTwinActive}
        sunTime={sunTime}
        onSunTimeChange={setSunTime}
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading DXF...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 max-w-md">
            <p className="text-destructive font-medium">Failed to load DXF</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}


      <Canvas
        shadows
        style={{ cursor: elementCommentMode ? 'crosshair' : 'grab' }}
        gl={{ preserveDrawingBuffer: true }} // Required for canvas capture
      >
        {/* Canvas capture provider - must be inside Canvas */}
        <CanvasCaptureProvider
          captureRef={captureRef}
          cameraRef={cameraRef}
        />

        {/* ACES filmic tone mapping — visible sun disc + warm horizon colours */}
        <RendererSetup />

        {/* Camera and controls based on mode */}
        <CameraControls ref={cameraControlsRef} mode={cameraMode} zoomRef={zoomRef} elementCommentMode={elementCommentMode} />

        {/* Sky — physically-based gradient driven by sun position */}
        {/* mieDirectionalG=0.9995 creates a tight forward-scattering peak visible as a
            sharp sun disc at any elevation (drei default 0.7 spreads into a broad glow
            that disappears against a bright noon sky) */}
        <Sky sunPosition={sunPos} rayleigh={3} turbidity={10} mieDirectionalG={0.9995} mieCoefficient={0.005} />

        {/* Hemisphere light — sky blue above, grass green below */}
        <hemisphereLight args={['#dceafc', '#4a6741', 0.5]} />

        {/* Low ambient fill so shadow areas are not pitch black */}
        <ambientLight intensity={0.15} />

        {/* Sun: single shadow-casting directional light */}
        <directionalLight
          position={[sunPos.x * 150, sunPos.y * 150, sunPos.z * 150]}
          intensity={sunIntensity}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-200}
          shadow-camera-right={200}
          shadow-camera-top={200}
          shadow-camera-bottom={-200}
          shadow-camera-far={600}
          shadow-bias={-0.0005}
        />

        {/* Ground: Satellite imagery if GPS coordinates available, otherwise grid */}
        {gpsCoordinates ? (
          <SatelliteGround gpsCoordinates={gpsCoordinates} groundSizeMeters={groundSizeMeters} />
        ) : (
          <Grid args={[100, 100]} cellColor="#6e6e6e" sectionColor="#9d4b4b" />
        )}

        {/* PV Layout from parsed DXF */}
        {parsedData && (
          <PVLayoutRenderer
            parsedData={parsedData}
            selectedPanelIndex={selectedPanelIndex}
            onPanelClick={handlePanelClick}
            showPanels={visibility.panels}
            showBoundaries={visibility.boundaries}
            showElectrical={visibility.electrical}
            showTrees={visibility.trees}
            elementCommentMode={elementCommentMode}
            onElementSelected={handleElementSelected}
            designId={designId}
            versionId={versionId}
            onBadgeClick={onBadgeClick}
            highlightedElementKey={highlightedElementKey}
            showPins={showPins}
            telemetry={digitalTwinActive ? telemetry : null}
            showDigitalTwinMetrics={digitalTwinActive && visibility.digitalTwinMetrics}
            showPerformanceHeatmap={digitalTwinActive && visibility.performanceHeatmap}
            cameraMode={cameraMode}
          />
        )}

        {/* Placeholder cube only when no data is loaded */}
        {!parsedData && !loading && !error && (
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        )}
      </Canvas>

      {/* Element Comment Dialog */}
      {selectedElement && (
        <ElementCommentDialog
          open={commentDialogOpen}
          onOpenChange={(open) => {
            if (!open) handleCommentDialogClose();
          }}
          elementAnchor={selectedElement}
          designId={designId}
          versionId={versionId}
          onCommentAdded={handleCommentDialogClose}
        />
      )}
    </div>
  );
});
