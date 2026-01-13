/**
 * Camera utilities for 3D viewer
 *
 * Provides element position lookup for camera focus functionality
 */

import type { PanelGeometry, ElectricalComponent } from '@/lib/dxf/types';

// Default dimensions for calculating panel positions (same as PanelInstances)
const DEFAULT_TABLE_WIDTH = 16.0;
const DEFAULT_TABLE_HEIGHT = 4.5;
const DEFAULT_TILT_ANGLE = 20;

/**
 * Get the 3D world position of an element for camera focus
 *
 * @param elementType - 'panel', 'inverter', 'transformer', 'combiner'
 * @param elementId - Panel index as string, or equipment ID
 * @param panels - Array of panel geometries
 * @param electrical - Array of electrical components
 * @param centerOffset - Layout center offset { x, z }
 * @returns World position [x, y, z] or null if element not found
 */
export function getElementPosition(
  elementType: string,
  elementId: string,
  panels: PanelGeometry[],
  electrical: ElectricalComponent[],
  centerOffset: { x: number; z: number }
): [number, number, number] | null {
  if (elementType === 'panel') {
    return getPanelPosition(elementId, panels, centerOffset);
  }

  // Equipment types: inverter, transformer, combiner
  return getEquipmentPosition(elementType, elementId, electrical, centerOffset);
}

/**
 * Calculate panel center position in world coordinates
 */
function getPanelPosition(
  elementId: string,
  panels: PanelGeometry[],
  centerOffset: { x: number; z: number }
): [number, number, number] | null {
  const index = parseInt(elementId, 10);
  if (isNaN(index) || index < 0 || index >= panels.length) {
    return null;
  }

  const panel = panels[index];

  // Calculate position same as in PanelInstances and ElementCommentMarkers
  const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
  const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
  const mountingHeight = panel.mountingHeight || panel.position[2] || 0.8;
  const tiltAngle = panel.tiltAngle || DEFAULT_TILT_ANGLE;
  const tiltRad = (tiltAngle * Math.PI) / 180;

  // Center height of tilted panel
  const centerHeight = mountingHeight + (tableHeight / 2) * Math.sin(tiltRad);

  // Calculate offset to center (same as PanelInstances)
  const halfWidth = tableWidth / 2;
  const halfDepth = (tableHeight / 2) * Math.cos(tiltRad);
  const azimuth = panel.rotation;
  const offsetX = halfWidth * Math.cos(azimuth) + halfDepth * Math.sin(azimuth);
  const offsetY = halfWidth * Math.sin(azimuth) - halfDepth * Math.cos(azimuth);

  // Apply center offset to get world position
  return [
    panel.position[0] + offsetX + centerOffset.x,
    centerHeight,
    -(panel.position[1] + offsetY) + centerOffset.z,
  ];
}

/**
 * Calculate equipment position in world coordinates
 */
function getEquipmentPosition(
  elementType: string,
  elementId: string,
  electrical: ElectricalComponent[],
  centerOffset: { x: number; z: number }
): [number, number, number] | null {
  const equipment = electrical.find(e => e.id === elementId && e.type === elementType);
  if (!equipment) {
    return null;
  }

  // Get equipment height (same defaults as Equipment3D)
  const defaultHeight =
    equipment.type === 'transformer' ? 3.0 :
    equipment.type === 'inverter' ? 0.6 : 0.8;
  const height = equipment.height || defaultHeight;

  // Apply transformer offset (same as Equipment3D)
  const isTransformer = equipment.type === 'transformer';

  return [
    equipment.position[0] + (isTransformer ? 4.5 : 0) + centerOffset.x,
    height / 2, // Center height of equipment box
    -equipment.position[1] + (isTransformer ? 7 : 0) + centerOffset.z,
  ];
}
