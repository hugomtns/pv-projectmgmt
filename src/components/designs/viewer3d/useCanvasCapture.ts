/**
 * useCanvasCapture - Hook to capture the Three.js canvas as a PNG image
 *
 * Must be used inside a @react-three/fiber Canvas component.
 */

import { useThree } from '@react-three/fiber';
import { useCallback } from 'react';

/**
 * Returns a function to capture the current canvas as a base64 PNG string
 */
export function useCanvasCapture() {
  const { gl, scene, camera } = useThree();

  const capture = useCallback((): string => {
    // Ensure the current frame is rendered
    gl.render(scene, camera);

    // Get the canvas data URL and extract the base64 portion
    const dataUrl = gl.domElement.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];

    return base64;
  }, [gl, scene, camera]);

  return capture;
}
