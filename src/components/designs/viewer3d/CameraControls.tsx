import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { MutableRefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { OrthographicCamera as ThreeOrthographicCamera } from 'three';

export interface CameraControlsRef {
  focusOn: (position: [number, number, number]) => void;
}

interface CameraControlsProps {
  mode: '3d' | '2d';
  zoomRef: MutableRefObject<number>;
  elementCommentMode?: boolean;
}

export interface Turntable2DControlsRef {
  focusOn: (position: [number, number, number]) => void;
}

interface Turntable2DControlsProps {
  zoomRef: MutableRefObject<number>;
  elementCommentMode?: boolean;
}

/**
 * Turntable2DControls - Custom controls for 2D mode with consistent rotation direction
 * Left-click drag: Rotate view (turntable style - always rotates in mouse direction)
 * Right-click drag: Pan
 * Scroll: Zoom (no limits)
 */
const Turntable2DControls = forwardRef<Turntable2DControlsRef, Turntable2DControlsProps>(
  function Turntable2DControls({ zoomRef, elementCommentMode = false }, ref) {
  const { camera, gl } = useThree();
  const commentModeRef = useRef(elementCommentMode);

  // Keep ref in sync with prop
  useEffect(() => {
    commentModeRef.current = elementCommentMode;
  }, [elementCommentMode]);
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

  // Expose focusOn method via ref
  useImperativeHandle(ref, () => ({
    focusOn: (position: [number, number, number]) => {
      // Update target to the element's X,Z position (Y is up in 3D, maps to ground plane)
      target.current.x = position[0];
      target.current.z = position[2];
      updateCamera();
    },
  }), []);

  useEffect(() => {
    // Apply shared zoom on mount
    if ('zoom' in camera) {
      (camera as ThreeOrthographicCamera).zoom = zoomRef.current;
      camera.updateProjectionMatrix();
    }

    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      // In comment mode, don't intercept left-clicks (allow R3F events through)
      if (commentModeRef.current && e.button === 0) {
        return;
      }
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

        // Pan speed: higher = faster panning
        const panX = deltaX * 1.0 * zoomScale;
        const panY = deltaY * 1.0 * zoomScale;

        // Use += so viewport follows mouse direction (drag right = see more right)
        target.current.x += panX * cos + panY * sin;
        target.current.z += -panX * sin + panY * cos;

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
});

/**
 * CameraControls - Manages camera mode switching between 3D and 2D views
 *
 * 3D Mode: PerspectiveCamera with full orbit controls for natural 3D viewing
 * 2D Mode: OrthographicCamera with top-down turntable rotation
 */
export const CameraControls = forwardRef<CameraControlsRef, CameraControlsProps>(
  function CameraControls({ mode, zoomRef, elementCommentMode = false }, ref) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const turntableRef = useRef<Turntable2DControlsRef>(null);
  const { camera } = useThree();

  // Expose focusOn method via ref
  useImperativeHandle(ref, () => ({
    focusOn: (position: [number, number, number]) => {
      if (mode === '2d') {
        // 2D mode: delegate to turntable controls
        turntableRef.current?.focusOn(position);
      } else {
        // 3D mode: animate orbit controls target to position
        const controls = controlsRef.current;
        if (controls) {
          // Set target to element position
          controls.target.set(position[0], position[1], position[2]);

          // Position camera at a nice viewing distance/angle from the target
          const distance = 40; // Distance from target
          const elevation = 25; // Height above target
          camera.position.set(
            position[0] + distance * 0.7,
            position[1] + elevation,
            position[2] + distance * 0.7
          );

          controls.update();
        }
      }
    },
  }), [mode, camera]);

  // Reset camera orientation when switching to 3D mode
  useEffect(() => {
    if (mode === '3d') {
      // Reset the up vector to default (fixes sideways view after 2D turntable rotation)
      camera.up.set(0, 1, 0);
      camera.updateProjectionMatrix();
    }
  }, [mode, camera]);

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
        <Turntable2DControls ref={turntableRef} zoomRef={zoomRef} elementCommentMode={elementCommentMode} />
      </>
    );
  }

  // 3D mode: Perspective camera for natural 3D viewing
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[80, 60, 80]}
        fov={45}
        near={0.1}
        far={2000}
      />
      <OrbitControls
        ref={controlsRef}
        enableRotate={!elementCommentMode}
        enableDamping
        dampingFactor={0.1}
        enablePan={!elementCommentMode}
        enableZoom
        zoomSpeed={1}
        panSpeed={1}
        target={[0, 0, 0]}
      />
    </>
  );
});
