import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { CameraControls } from './CameraControls';
import type { CameraControlsRef } from './CameraControls';
import { ViewportToolbar } from './ViewportToolbar';
import { SatelliteGround } from './SatelliteGround';
import { PVLayoutRenderer, LayoutInfo } from './PVLayoutRenderer';
import { ElementCommentDialog } from './ElementCommentDialog';
import { parseDXFFromURL } from '@/lib/dxf/parser';
import { getElementPosition } from './cameraUtils';
import type { DXFParsedData, PanelGeometry } from '@/lib/dxf/types';
import type { GPSCoordinates, ElementAnchor } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export interface PV3DCanvasRef {
  focusOnElement: (elementType: string, elementId: string) => void;
}

interface PV3DCanvasProps {
  designId: string;
  versionId: string;
  fileUrl: string;
  gpsCoordinates?: GPSCoordinates;
  groundSizeMeters?: number;
  highlightedElementKey?: string | null;
  onBadgeClick?: (elementType: string, elementId: string) => void;
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
}, ref) {
  const [cameraMode, setCameraMode] = useState<CameraMode>('3d');
  // Shared zoom level between modes (default 8 for good initial view with orthographic)
  const zoomRef = useRef(8);
  const cameraControlsRef = useRef<CameraControlsRef>(null);

  // DXF parsing state
  const [parsedData, setParsedData] = useState<DXFParsedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState<number | null>(null);

  // Element comment mode state
  const [elementCommentMode, setElementCommentMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementAnchor | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

  // Load and parse DXF file when URL changes
  useEffect(() => {
    if (!fileUrl) return;

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
  }, [fileUrl]);

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

  // Expose focusOnElement via ref
  useImperativeHandle(ref, () => ({
    focusOnElement,
  }), [focusOnElement]);

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

      {/* Layout info overlay */}
      {parsedData && <LayoutInfo parsedData={parsedData} />}

      <Canvas
        style={{ cursor: elementCommentMode ? 'crosshair' : 'grab' }}
      >
        {/* Camera and controls based on mode */}
        <CameraControls ref={cameraControlsRef} mode={cameraMode} zoomRef={zoomRef} elementCommentMode={elementCommentMode} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

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
            showPanels={true}
            showBoundaries={true}
            showElectrical={true}
            elementCommentMode={elementCommentMode}
            onElementSelected={handleElementSelected}
            designId={designId}
            versionId={versionId}
            onBadgeClick={onBadgeClick}
            highlightedElementKey={highlightedElementKey}
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
