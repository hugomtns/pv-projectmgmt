import { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { CameraControls } from './CameraControls';
import { ViewportToolbar } from './ViewportToolbar';

interface PV3DCanvasProps {
  designId: string;
  versionId: string;
  fileUrl: string;
}

type CameraMode = '3d' | '2d';

/**
 * PV3DCanvas - Main WebGL canvas for 3D PV layout visualization
 * Uses React Three Fiber for declarative 3D rendering
 */
export function PV3DCanvas({ designId, versionId, fileUrl }: PV3DCanvasProps) {
  const [cameraMode, setCameraMode] = useState<CameraMode>('3d');
  // Shared zoom level between modes (default 8 for good initial view with orthographic)
  const zoomRef = useRef(8);

  // TODO: Use designId and versionId for loading actual 3D data
  // For now, these are placeholders for Story 1 (foundation)
  console.log('PV3DCanvas loaded:', { designId, versionId, fileUrl });

  return (
    <div className="w-full h-full relative">
      {/* Viewport toolbar overlay */}
      <ViewportToolbar mode={cameraMode} onModeChange={setCameraMode} />

      <Canvas>
        {/* Camera and controls based on mode */}
        <CameraControls mode={cameraMode} zoomRef={zoomRef} />

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
