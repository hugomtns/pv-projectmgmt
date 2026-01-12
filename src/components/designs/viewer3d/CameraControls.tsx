import { useRef, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { OrthographicCamera as ThreeOrthographicCamera } from 'three';

interface CameraControlsProps {
  mode: '3d' | '2d';
  zoomRef: MutableRefObject<number>;
}

interface Turntable2DControlsProps {
  zoomRef: MutableRefObject<number>;
}

/**
 * Turntable2DControls - Custom controls for 2D mode with consistent rotation direction
 * Left-click drag: Rotate view (turntable style - always rotates in mouse direction)
 * Right-click drag: Pan
 * Scroll: Zoom (no limits)
 */
function Turntable2DControls({ zoomRef }: Turntable2DControlsProps) {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const azimuth = useRef(0);
  const target = useRef({ x: 0, z: 0 });
  const cameraHeight = 100;

  const updateCamera = () => {
    camera.position.x = target.current.x;
    camera.position.y = cameraHeight;
    camera.position.z = target.current.z;

    const upX = Math.sin(azimuth.current);
    const upZ = Math.cos(azimuth.current);
    camera.up.set(upX, 0, upZ);

    camera.lookAt(target.current.x, 0, target.current.z);
    camera.updateProjectionMatrix();
  };

  useEffect(() => {
    // Apply shared zoom on mount
    if ('zoom' in camera) {
      (camera as ThreeOrthographicCamera).zoom = zoomRef.current;
      camera.updateProjectionMatrix();
    }

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
        azimuth.current += deltaX * 0.005;
        updateCamera();
      }

      if (isPanning.current) {
        const zoomScale = 1 / zoomRef.current;
        const cos = Math.cos(azimuth.current);
        const sin = Math.sin(azimuth.current);

        const panX = deltaX * 0.3 * zoomScale;
        const panY = deltaY * 0.3 * zoomScale;

        target.current.x -= panX * cos + panY * sin;
        target.current.z -= -panX * sin + panY * cos;

        updateCamera();
      }

      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      zoomRef.current *= zoomFactor;

      if ('zoom' in camera) {
        (camera as ThreeOrthographicCamera).zoom = zoomRef.current;
        camera.updateProjectionMatrix();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

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
  }, [camera, gl, zoomRef]);

  return null;
}

/**
 * CameraControls - Manages camera mode switching between 3D and 2D orthographic views
 * Uses OrthographicCamera for both modes to ensure consistent zoom levels
 *
 * 3D Mode: Angled orthographic view with full orbit controls
 * 2D Mode: Top-down orthographic view with turntable rotation
 */
export function CameraControls({ mode, zoomRef }: CameraControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  // Track zoom changes from OrbitControls in 3D mode
  useEffect(() => {
    if (mode === '3d' && controlsRef.current) {
      const handleChange = () => {
        if ('zoom' in camera) {
          zoomRef.current = (camera as ThreeOrthographicCamera).zoom;
        }
      };

      controlsRef.current.addEventListener('change', handleChange);
      return () => {
        controlsRef.current?.removeEventListener('change', handleChange);
      };
    }
  }, [mode, camera, zoomRef]);

  // Apply zoom and reset camera orientation when switching to 3D mode
  useEffect(() => {
    if (mode === '3d') {
      // Reset the up vector to default (fixes sideways view after 2D turntable rotation)
      camera.up.set(0, 1, 0);

      if ('zoom' in camera) {
        (camera as ThreeOrthographicCamera).zoom = zoomRef.current;
        camera.updateProjectionMatrix();
      }
    }
  }, [mode, camera, zoomRef]);

  if (mode === '2d') {
    return (
      <>
        <OrthographicCamera
          makeDefault
          position={[0, 100, 0]}
          zoom={zoomRef.current}
          near={0.1}
          far={1000}
        />
        <Turntable2DControls zoomRef={zoomRef} />
      </>
    );
  }

  // 3D mode: Angled orthographic view
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[50, 50, 50]}
        zoom={zoomRef.current}
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
