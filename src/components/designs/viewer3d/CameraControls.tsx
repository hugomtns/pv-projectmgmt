import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { OrthographicCamera as ThreeOrthographicCamera } from 'three';

interface CameraControlsProps {
  mode: '3d' | '2d';
}

/**
 * Turntable2DControls - Custom controls for 2D mode with consistent rotation direction
 * Left-click drag: Rotate view (turntable style - always rotates in mouse direction)
 * Right-click drag: Pan
 * Scroll: Zoom
 */
function Turntable2DControls() {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const azimuth = useRef(0); // Rotation angle around Y axis
  const target = useRef({ x: 0, z: 0 }); // Look-at target
  const targetZoom = useRef(2);
  const cameraHeight = 100;

  // Update camera position based on azimuth and target
  const updateCamera = () => {
    camera.position.x = target.current.x;
    camera.position.y = cameraHeight;
    camera.position.z = target.current.z;

    // Rotate the camera's up vector to create turntable effect
    const upX = Math.sin(azimuth.current);
    const upZ = Math.cos(azimuth.current);
    camera.up.set(upX, 0, upZ);

    camera.lookAt(target.current.x, 0, target.current.z);
    camera.updateProjectionMatrix();
  };

  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging.current = true;
      } else if (e.button === 2) {
        isPanning.current = true;
      }
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      isPanning.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastMouse.current.x;
      const deltaY = e.clientY - lastMouse.current.y;

      if (isDragging.current) {
        // Turntable rotation - horizontal mouse movement rotates the view
        azimuth.current += deltaX * 0.005;
        updateCamera();
      }

      if (isPanning.current) {
        // Pan relative to current view orientation
        const zoomScale = 'zoom' in camera ? 1 / (camera as ThreeOrthographicCamera).zoom : 1;
        const cos = Math.cos(azimuth.current);
        const sin = Math.sin(azimuth.current);

        const panX = deltaX * 0.3 * zoomScale;
        const panY = deltaY * 0.3 * zoomScale;

        // Transform pan to world space based on current rotation
        target.current.x -= panX * cos + panY * sin;
        target.current.z -= -panX * sin + panY * cos;

        updateCamera();
      }

      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.001;
      targetZoom.current = Math.max(0.5, Math.min(20, targetZoom.current - zoomDelta));
      if ('zoom' in camera) {
        (camera as ThreeOrthographicCamera).zoom = targetZoom.current;
        camera.updateProjectionMatrix();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Initialize camera position
    updateCamera();

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [camera, gl]);

  return null;
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
        <Turntable2DControls />
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
        dampingFactor={0.1}
        enablePan
        enableZoom
        zoomSpeed={1}
        panSpeed={1}
      />
    </>
  );
}
