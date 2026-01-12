import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';

interface PV3DCanvasProps {
  designId: string;
  versionId: string;
  fileUrl: string;
}

/**
 * PV3DCanvas - Main WebGL canvas for 3D PV layout visualization
 * Uses React Three Fiber for declarative 3D rendering
 */
export function PV3DCanvas({ designId, versionId, fileUrl }: PV3DCanvasProps) {
  // TODO: Use designId and versionId for loading actual 3D data
  // For now, these are placeholders for Story 1 (foundation)
  console.log('PV3DCanvas loaded:', { designId, versionId, fileUrl });

  return (
    <div className="w-full h-full">
      <Canvas>
        {/* Camera */}
        <PerspectiveCamera makeDefault position={[50, 50, 50]} fov={60} />

        {/* Controls */}
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
