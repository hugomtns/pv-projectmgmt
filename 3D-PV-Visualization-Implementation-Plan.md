# 3D PV Layout Visualization Implementation Plan

## Overview
Transform the design system from static file viewer to interactive 3D PV (photovoltaic) layout visualization using WebGL. This enables users to view, interact with, and annotate solar panel installations in an immersive 3D/2D environment with satellite imagery overlay.

## User Requirements
- WebGL-based 3D rendering using react-three-fiber (R3F)
- Toggle between 3D perspective and 2D orthographic (top-down) views
- Satellite imagery overlay as ground plane (user-provided GPS coordinates)
- DXF file import with automatic parsing and rendering of PV layouts
- Interactive features: selection, highlighting, 3D commenting, distance measurements
- Performance optimization for utility-scale layouts (1,000-10,000+ panels)

## Architecture Decisions

### Technology Stack
**Core 3D Engine:**
- `@react-three/fiber` - React renderer for Three.js (declarative 3D components)
- `@react-three/drei` - Utility components (OrbitControls, loaders, helpers)
- `three` - Low-level WebGL 3D engine

**File Parsing:**
- `dxf-parser` - DXF file parsing (CAD drawings)
- Support formats: DXF (primary), GLTF, FBX, OBJ
- Note: Direct DWG support deferred (can add later if DXF conversion loses critical data)

**Satellite Imagery:**
- OpenStreetMap tiles (free, no API key required)
- User provides GPS coordinates (latitude/longitude) in design metadata
- Future: Optional upgrade to Mapbox for higher quality

**Performance Strategy (Critical for 1,000-10,000 panels):**
- **InstancedMesh** - Render thousands of identical panels with single draw call
- **Level of Detail (LOD)** - Reduce polygon count for distant objects
- **Frustum Culling** - Built-in Three.js optimization
- **Raycasting Optimization** - Spatial indexing for selection
- **Progressive Loading** - Load high-detail models only when needed

### Data Model Extensions

**New DesignVersion File Types:**
Current: `'image' | 'pdf'`
New: `'image' | 'pdf' | 'dxf' | 'gltf' | 'fbx' | 'obj'`

**Design Metadata for 3D:**
```typescript
interface Design {
  // ... existing fields
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    elevation?: number; // Optional, meters above sea level
  };
  renderSettings?: {
    satelliteImageryEnabled: boolean;
    satelliteZoomLevel: number; // 10-20 (higher = more detail)
  };
}
```

**3D Comment Anchoring (Extends Existing):**
```typescript
interface DesignComment {
  // ... existing fields
  x?: number; // Existing (2D documents), or 3D X coordinate
  y?: number; // Existing (2D documents), or 3D Y coordinate
  z?: number; // NEW: 3D Z coordinate (vertical)
  // If x,y,z all present → 3D comment
  // If only x,y → 2D document comment
  // If all undefined → design-level comment
}
```

### Integration Points

**DesignViewer.tsx (lines 204-263):**
Current canvas area renders PDF/images. This div will conditionally render:
- PDF viewer (for .pdf files)
- Image viewer (for .png, .jpg files)
- **PV3DCanvas component (for .dxf, .gltf, .fbx, .obj files)** ← NEW

**Component Structure:**
```
src/components/designs/viewer3d/
├── PV3DCanvas.tsx         # Main R3F Canvas container
├── Scene3D.tsx            # Scene setup (lights, camera, controls)
├── SatelliteGround.tsx    # Ground plane with satellite imagery
├── PVLayoutRenderer.tsx   # Renders parsed DXF/CAD data
├── PanelInstances.tsx     # InstancedMesh for solar panels
├── MountingStructure.tsx  # Rails, supports, frames
├── ElectricalComponents.tsx # Inverters, combiner boxes
├── CameraControls.tsx     # Camera toggle, OrbitControls wrapper
├── SelectionManager.tsx   # Raycasting, highlighting
├── MeasurementTool.tsx    # Distance measurement
├── Comment3DMarkers.tsx   # 3D comment visualization
└── ViewportToolbar.tsx    # 3D/2D toggle, settings
```

---

## Implementation Stories

### Story 1: R3F Foundation & Basic 3D Canvas
**Goal**: Set up react-three-fiber with basic 3D scene rendering

**Dependencies to Install:**
```bash
npm install three @react-three/fiber @react-three/drei
npm install --save-dev @types/three
```

**Files to Create:**
- `src/components/designs/viewer3d/PV3DCanvas.tsx` - Main Canvas wrapper
- `src/components/designs/viewer3d/Scene3D.tsx` - Lights, camera, grid helper

**Files to Modify:**
- `src/components/designs/DesignViewer.tsx` (lines 204-263):
  ```tsx
  {currentVersion?.fileType === 'dxf' ||
   currentVersion?.fileType === 'gltf' ||
   currentVersion?.fileType === 'fbx' ||
   currentVersion?.fileType === 'obj' ? (
    <PV3DCanvas
      designId={design.id}
      versionId={currentVersion.id}
      fileUrl={fileUrl}
    />
  ) : currentVersion?.fileType === 'pdf' ? (
    // ... existing PDF renderer
  ) : (
    // ... existing image renderer
  )}
  ```

**PV3DCanvas Implementation:**
```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';

export function PV3DCanvas({ designId, versionId, fileUrl }: Props) {
  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera makeDefault position={[50, 50, 50]} fov={60} />
        <OrbitControls enableDamping dampingFactor={0.05} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

        {/* Ground grid (temporary, will be replaced by satellite imagery) */}
        <Grid args={[100, 100]} cellColor="#6e6e6e" sectionColor="#9d4b4b" />

        {/* Placeholder cube for testing */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      </Canvas>
    </div>
  );
}
```

**Acceptance Criteria:**
- ✅ 3D canvas renders in DesignViewer for 3D file types
- ✅ Camera controls work (orbit, zoom, pan with mouse)
- ✅ Grid helper visible as temporary ground reference
- ✅ Lighting shows 3D depth perception
- ✅ Responsive canvas fills available space
- ✅ No console errors, smooth 60fps

**Verification:**
1. Upload a placeholder .gltf file to a design
2. Navigate to design detail page
3. Verify 3D canvas renders with grid and test cube
4. Test mouse controls (left drag = orbit, right drag = pan, scroll = zoom)

---

### Story 2: Camera Mode Toggle (3D ↔ 2D Orthographic)
**Goal**: Users can switch between perspective and top-down orthographic views

**Files to Create:**
- `src/components/designs/viewer3d/CameraControls.tsx` - Camera manager component
- `src/components/designs/viewer3d/ViewportToolbar.tsx` - 3D/2D toggle button

**Files to Modify:**
- `src/components/designs/viewer3d/PV3DCanvas.tsx` - Add camera mode state and toolbar

**Implementation Pattern:**
```tsx
// CameraControls.tsx
import { PerspectiveCamera, OrthographicCamera } from '@react-three/drei';

export function CameraControls({ mode }: { mode: '3d' | '2d' }) {
  if (mode === '2d') {
    return (
      <OrthographicCamera
        makeDefault
        position={[0, 100, 0]}
        zoom={5}
        up={[0, 0, -1]} // Look straight down
      />
    );
  }

  return (
    <PerspectiveCamera
      makeDefault
      position={[50, 50, 50]}
      fov={60}
    />
  );
}

// ViewportToolbar.tsx
export function ViewportToolbar({ mode, onModeChange }: Props) {
  return (
    <div className="absolute top-4 left-4 z-10 flex gap-2">
      <Button
        size="sm"
        variant={mode === '3d' ? 'default' : 'outline'}
        onClick={() => onModeChange('3d')}
      >
        3D View
      </Button>
      <Button
        size="sm"
        variant={mode === '2d' ? 'default' : 'outline'}
        onClick={() => onModeChange('2d')}
      >
        2D Top-Down
      </Button>
    </div>
  );
}
```

**OrbitControls Adjustments:**
- 3D mode: Full rotation enabled
- 2D mode: Disable rotation, only pan and zoom (set `enableRotate={mode === '3d'}`)

**Acceptance Criteria:**
- ✅ Toggle button switches camera modes
- ✅ 3D mode: Perspective camera with full orbit controls
- ✅ 2D mode: Orthographic top-down view, no rotation, no perspective distortion
- ✅ Smooth transition between modes (camera animates to new position)
- ✅ Camera mode persists in component state (doesn't reset on re-render)

**Verification:**
1. Click "2D Top-Down" button
2. Verify view changes to orthographic (parallel lines stay parallel)
3. Verify rotation is disabled in 2D mode
4. Click "3D View" button
5. Verify perspective returns and rotation works

---

### Story 3: Satellite Imagery Ground Plane
**Goal**: Replace grid with satellite imagery overlay using GPS coordinates

**Files to Create:**
- `src/components/designs/viewer3d/SatelliteGround.tsx` - Textured ground plane
- `src/lib/satelliteImagery.ts` - OSM tile URL generation utilities

**Files to Modify:**
- `src/lib/types.ts` - Add GPS coordinates to Design interface
- `src/stores/designStore.ts` - Add `updateGPSCoordinates` action
- `src/components/designs/DesignUploadDialog.tsx` - Add GPS coordinate inputs (optional)
- `src/components/designs/DesignViewer.tsx` - Pass GPS data to PV3DCanvas

**Design Interface Extension:**
```typescript
export interface Design {
  // ... existing fields
  gpsCoordinates?: {
    latitude: number;   // e.g., 37.7749
    longitude: number;  // e.g., -122.4194
    elevation?: number; // meters above sea level (optional)
  };
  satelliteZoomLevel?: number; // Default: 18 (high detail)
}
```

**OSM Tile URL Generation:**
```typescript
// src/lib/satelliteImagery.ts
export function getTileCoordinates(lat: number, lon: number, zoom: number) {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) +
    1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y, zoom };
}

export function getOSMSatelliteURL(lat: number, lon: number, zoom: number): string {
  const { x, y } = getTileCoordinates(lat, lon, zoom);
  // OpenStreetMap satellite tiles (free, no API key)
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
}
```

**SatelliteGround Component:**
```tsx
import { useTexture } from '@react-three/drei';
import { getOSMSatelliteURL } from '@/lib/satelliteImagery';

export function SatelliteGround({ gpsCoordinates, zoom = 18 }: Props) {
  const tileURL = getOSMSatelliteURL(
    gpsCoordinates.latitude,
    gpsCoordinates.longitude,
    zoom
  );

  const texture = useTexture(tileURL);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
```

**GPS Input in Upload Dialog:**
```tsx
// Optional fields in DesignUploadDialog
<div className="grid grid-cols-2 gap-4">
  <div>
    <Label>Latitude (optional)</Label>
    <Input
      type="number"
      step="0.000001"
      placeholder="37.7749"
      value={latitude}
      onChange={(e) => setLatitude(e.target.value)}
    />
  </div>
  <div>
    <Label>Longitude (optional)</Label>
    <Input
      type="number"
      step="0.000001"
      placeholder="-122.4194"
      value={longitude}
      onChange={(e) => setLongitude(e.target.value)}
    />
  </div>
</div>
```

**Acceptance Criteria:**
- ✅ GPS coordinates can be entered when uploading/editing designs
- ✅ Satellite imagery loads and displays as ground plane
- ✅ Imagery aligns correctly with coordinate system
- ✅ Fallback to gray plane if no GPS coordinates provided
- ✅ Toggle to show/hide satellite imagery (show grid instead)
- ✅ No CORS errors loading OSM tiles

**Pitfalls:**
- **CORS**: OSM tiles should work without CORS issues, but test thoroughly
- **Tile resolution**: Zoom level 18 provides ~0.5m/pixel resolution (good for layouts)
- **Multiple tiles**: For large layouts, may need to load 4-9 tiles and stitch them

**Verification:**
1. Upload design with GPS coordinates (e.g., 37.7749, -122.4194)
2. Verify satellite imagery loads on ground plane
3. Verify imagery shows recognizable terrain features
4. Test without GPS coordinates (should show grid fallback)

---

### Story 4: DXF File Parsing & Layer Extraction
**Goal**: Parse DXF files and extract PV layout geometry (panels, mounting structures, electrical)

**Dependencies:**
```bash
npm install dxf-parser
npm install --save-dev @types/dxf-parser
```

**Files to Create:**
- `src/lib/dxf/parser.ts` - DXF parsing logic
- `src/lib/dxf/pvLayerDetection.ts` - Identify panel, mounting, electrical layers
- `src/lib/dxf/geometryConverter.ts` - Convert DXF entities to Three.js geometry

**DXF Layer Conventions:**
DXF files typically organize PV layouts into layers:
- `PANELS` or `PV_MODULES` - Solar panel rectangles
- `MOUNTING` or `RAILS` - Support structures
- `INVERTERS` - Inverter locations (points or blocks)
- `COMBINER_BOXES` - Electrical combiner boxes
- `TERRAIN` or `SITE` - Ground contours

**Parser Implementation:**
```typescript
// src/lib/dxf/parser.ts
import DxfParser from 'dxf-parser';

export interface DXFParsedData {
  panels: PanelGeometry[];
  mounting: MountingGeometry[];
  electrical: ElectricalComponent[];
  terrain?: TerrainGeometry;
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

export interface PanelGeometry {
  id: string;
  position: [number, number, number]; // x, y, z
  rotation: number; // radians
  dimensions: [number, number]; // width, height in meters
  layer: string;
}

export async function parseDXFFile(fileBlob: ArrayBuffer): Promise<DXFParsedData> {
  const parser = new DxfParser();
  const text = new TextDecoder().decode(fileBlob);
  const dxf = parser.parseSync(text);

  if (!dxf) {
    throw new Error('Failed to parse DXF file');
  }

  // Extract entities by layer
  const panels: PanelGeometry[] = [];
  const mounting: MountingGeometry[] = [];
  const electrical: ElectricalComponent[] = [];

  dxf.entities.forEach((entity) => {
    const layerName = entity.layer?.toLowerCase() || '';

    // Detect panels (typically LWPOLYLINE or INSERT blocks)
    if (layerName.includes('panel') || layerName.includes('pv')) {
      if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        panels.push(convertPolylineToPanel(entity));
      } else if (entity.type === 'INSERT') {
        panels.push(convertBlockToPanel(entity));
      }
    }

    // Detect mounting structures (lines, polylines)
    if (layerName.includes('mount') || layerName.includes('rail')) {
      mounting.push(convertToMounting(entity));
    }

    // Detect electrical components (points, blocks)
    if (layerName.includes('inverter') || layerName.includes('combiner')) {
      electrical.push(convertToElectrical(entity));
    }
  });

  // Calculate bounding box
  const bounds = calculateBounds([...panels, ...mounting]);

  return { panels, mounting, electrical, bounds };
}

function convertPolylineToPanel(entity: any): PanelGeometry {
  // Extract vertices and calculate center, rotation, dimensions
  const vertices = entity.vertices;
  const center = calculateCenter(vertices);
  const dimensions = calculateDimensions(vertices);
  const rotation = calculateRotation(vertices);

  return {
    id: crypto.randomUUID(),
    position: [center.x, center.y, center.z || 0],
    rotation,
    dimensions,
    layer: entity.layer,
  };
}
```

**Layer Detection Strategy:**
```typescript
// src/lib/dxf/pvLayerDetection.ts
export function detectPVLayers(dxf: any): LayerClassification {
  const layers = dxf.tables?.layer?.layers || {};
  const classification: LayerClassification = {
    panels: [],
    mounting: [],
    electrical: [],
    terrain: [],
    unknown: [],
  };

  for (const [name, layer] of Object.entries(layers)) {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('panel') || lowerName.includes('pv') || lowerName.includes('module')) {
      classification.panels.push(name);
    } else if (lowerName.includes('mount') || lowerName.includes('rail') || lowerName.includes('rack')) {
      classification.mounting.push(name);
    } else if (lowerName.includes('inverter') || lowerName.includes('combiner') || lowerName.includes('electrical')) {
      classification.electrical.push(name);
    } else if (lowerName.includes('terrain') || lowerName.includes('site') || lowerName.includes('ground')) {
      classification.terrain.push(name);
    } else {
      classification.unknown.push(name);
    }
  }

  return classification;
}
```

**Acceptance Criteria:**
- ✅ DXF files load without errors
- ✅ Parser extracts panel entities (polylines, blocks)
- ✅ Parser extracts mounting structure geometry
- ✅ Parser extracts electrical component locations
- ✅ Layer detection identifies PV-specific layers accurately
- ✅ Bounding box calculated for camera auto-framing
- ✅ Error handling for malformed DXF files

**Pitfalls:**
- **Layer naming inconsistency**: Different CAD users name layers differently (add fuzzy matching)
- **Coordinate systems**: DXF might use architectural units (inches, feet) - need conversion
- **Complex blocks**: Some panels might be nested blocks (handle recursion)
- **Missing Z coordinates**: 2D DXF files have Z=0, need to infer mounting height

**Verification:**
1. Create sample DXF with rectangles on "PANELS" layer
2. Upload DXF to design
3. Parse file and log extracted geometry to console
4. Verify panel count, positions, dimensions are correct

---

### Story 5: Panel Rendering with InstancedMesh
**Goal**: Render 1,000-10,000 panels efficiently using Three.js InstancedMesh

**Files to Create:**
- `src/components/designs/viewer3d/PanelInstances.tsx` - InstancedMesh renderer
- `src/components/designs/viewer3d/PVLayoutRenderer.tsx` - Orchestrator for all geometry

**Why InstancedMesh:**
- Standard approach: 10,000 panels = 10,000 draw calls = ~10 FPS ❌
- InstancedMesh: 10,000 panels = 1 draw call = 60 FPS ✅
- Trade-off: All instances share same geometry/material

**PanelInstances Implementation:**
```tsx
import { useMemo, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { PanelGeometry } from '@/lib/dxf/parser';

export function PanelInstances({ panels }: { panels: PanelGeometry[] }) {
  const meshRef = useRef<InstancedMesh>(null);

  // Create transformation matrix for each panel
  useMemo(() => {
    if (!meshRef.current) return;

    const tempObject = new Object3D();

    panels.forEach((panel, i) => {
      // Set position, rotation, scale
      tempObject.position.set(...panel.position);
      tempObject.rotation.z = panel.rotation;
      tempObject.scale.set(panel.dimensions[0], panel.dimensions[1], 0.05); // Thin panel

      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [panels]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, panels.length]}>
      {/* Standard 1x1 box geometry, scaled by instance matrix */}
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
    </instancedMesh>
  );
}
```

**PVLayoutRenderer (Orchestrator):**
```tsx
export function PVLayoutRenderer({ parsedData }: { parsedData: DXFParsedData }) {
  return (
    <group>
      {/* Solar panels (instanced for performance) */}
      <PanelInstances panels={parsedData.panels} />

      {/* Mounting structures (can also be instanced if repetitive) */}
      <MountingStructure geometry={parsedData.mounting} />

      {/* Electrical components (small count, can render individually) */}
      <ElectricalComponents components={parsedData.electrical} />
    </group>
  );
}
```

**Integration:**
```tsx
// In PV3DCanvas.tsx
const [parsedData, setParsedData] = useState<DXFParsedData | null>(null);

useEffect(() => {
  if (fileUrl && fileUrl.endsWith('.dxf')) {
    fetch(fileUrl)
      .then(res => res.arrayBuffer())
      .then(buffer => parseDXFFile(buffer))
      .then(data => setParsedData(data))
      .catch(err => toast.error('Failed to parse DXF'));
  }
}, [fileUrl]);

// In Canvas:
{parsedData && <PVLayoutRenderer parsedData={parsedData} />}
```

**Acceptance Criteria:**
- ✅ 1,000+ panels render at 60 FPS
- ✅ All panels visible with correct positions and rotations
- ✅ Panel appearance realistic (blue, reflective material)
- ✅ Memory usage reasonable (<500MB for 10k panels)
- ✅ Camera auto-frames to layout bounds on load

**Performance Benchmarks:**
- 1,000 panels: 60 FPS ✅
- 5,000 panels: 60 FPS ✅
- 10,000 panels: 45-60 FPS ✅
- 20,000 panels: 30-45 FPS ⚠️ (may need LOD)

**Verification:**
1. Load DXF with 1,000 panels
2. Monitor FPS (press Shift+Ctrl+I → Performance)
3. Verify smooth camera controls
4. Zoom in/out to test rendering at various distances

---

(Continue with Stories 6-10 and remaining sections...)

---

## Key Architectural Decisions Confirmed
1. ✅ DXF format (not DWG initially)
2. ✅ Coordinate-based 3D comments (not element IDs)
3. ✅ User-provided GPS coordinates (not DXF-embedded)
4. ✅ Utility-scale optimization (1,000-10,000 panels)
5. ✅ InstancedMesh + LOD performance strategy

**Next step**: User approval of this plan, then switch to implementation mode and begin Story 1.
