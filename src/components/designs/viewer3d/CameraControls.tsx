import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

interface CameraControlsProps {
  mode: '3d' | '2d';
}

/**
 * Turntable2DControls - Custom controls for 2D mode with consistent rotation direction
 * Left-click drag: Rotate scene (turntable style - always rotates in mouse direction)
 * Right-click drag: Pan
 * Scroll: Zoom
 */
function Turntable2DControls() {
  const { camera, gl, scene } = useThree();
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const sceneRotation = useRef(0);
  const panOffset = useRef({ x: 0, z: 0 });
  const targetZoom = useRef(2);

  // Create a pivot group for rotation
  const pivotRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    // Find or create pivot group
    let pivot = scene.getObjectByName('turntable-pivot') as THREE.Group;
    if (!pivot) {
      pivot = new THREE.Group();
      pivot.name = 'turntable-pivot';

      // Move all scene children (except camera-related) into pivot
      const childrenToMove = scene.children.filter(
        child => child !== camera && !child.name.includes('camera')
      );
      childrenToMove.forEach(child => {
        scene.remove(child);
        pivot.add(child);
      });
      scene.add(pivot);
    }
    pivotRef.current = pivot;

    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left click - rotate
        isDragging.current = true;
      } else if (e.button === 2) { // Right click - pan
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

      if (isDragging.current && pivotRef.current) {
        // Turntable rotation - horizontal mouse movement = Y-axis rotation
        sceneRotation.current -= deltaX * 0.005;
        pivotRef.current.rotation.y = sceneRotation.current;
      }

      if (isPanning.current) {
        // Pan based on current rotation
        const cos = Math.cos(sceneRotation.current);
        const sin = Math.sin(sceneRotation.current);
        const panX = deltaX * 0.5;
        const panZ = deltaY * 0.5;

        panOffset.current.x -= panX * cos - panZ * sin;
        panOffset.current.z -= panX * sin + panZ * cos;

        camera.position.x = panOffset.current.x;
        camera.position.z = panOffset.current.z;
        camera.updateProjectionMatrix();
      }

      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.001;
      targetZoom.current = Math.max(0.5, Math.min(20, targetZoom.current - zoomDelta));
      if ('zoom' in camera) {
        (camera as THREE.OrthographicCamera).zoom = targetZoom.current;
        camera.updateProjectionMatrix();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent right-click menu
    };

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
  }, [camera, gl, scene]);

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
