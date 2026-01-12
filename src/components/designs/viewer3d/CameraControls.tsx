import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraControlsProps {
  mode: '3d' | '2d';
}

/**
 * CameraControls - Manages camera mode switching between 3D perspective and 2D orthographic views
 *
 * 3D Mode: Perspective camera with full orbit controls (rotate, pan, zoom)
 * 2D Mode: Orthographic top-down view with turntable rotation, pan, and zoom
 */
export function CameraControls({ mode }: CameraControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { invalidate } = useThree();

  // Reset controls when mode changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      invalidate();
    }
  }, [mode, invalidate]);

  if (mode === '2d') {
    return (
      <>
        <OrthographicCamera
          makeDefault
          position={[0, 100, 0]}
          zoom={2}
          near={0.1}
          far={1000}
        />
        <OrbitControls
          ref={controlsRef}
          enableRotate
          enableDamping
          dampingFactor={0.05}
          // Lock polar angle for top-down view, but allow azimuthal (turntable) rotation
          minPolarAngle={0.01} // Small value to avoid gimbal lock at exactly 0
          maxPolarAngle={0.01}
          // Allow pan and zoom
          enablePan
          enableZoom
          zoomSpeed={1}
          panSpeed={1}
          rotateSpeed={0.5}
        />
      </>
    );
  }

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[50, 50, 50]}
        fov={60}
        near={0.1}
        far={1000}
      />
      <OrbitControls
        ref={controlsRef}
        enableRotate
        enableDamping
        dampingFactor={0.05}
        enablePan
        enableZoom
        zoomSpeed={1}
        panSpeed={1}
      />
    </>
  );
}
