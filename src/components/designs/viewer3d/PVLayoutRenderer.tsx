/**
 * PVLayoutRenderer - Orchestrates rendering of parsed DXF PV layout
 *
 * Renders all geometry types from parsed DXF data:
 * - Panels (via PanelInstances for performance)
 * - Mounting structures
 * - Electrical components
 * - Boundaries/areas
 * - Trees (for shading visualization)
 */

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { DXFParsedData, PanelGeometry, BoundaryGeometry, ElectricalComponent } from '@/lib/dxf/types';
import type { ElementAnchor } from '@/lib/types';
import { PanelInstances } from './PanelInstances';
import { Equipment3D } from './Equipment3D';
import { Tree3D } from './Tree3D';
import { ElementCommentMarkers } from './ElementCommentMarkers';

interface PVLayoutRendererProps {
  parsedData: DXFParsedData;
  showPanels?: boolean;
  showBoundaries?: boolean;
  showElectrical?: boolean;
  showTrees?: boolean;
  selectedPanelIndex?: number | null;
  onPanelClick?: (index: number, panel: PanelGeometry) => void;
  // Element comment mode
  elementCommentMode?: boolean;
  onElementSelected?: (element: ElementAnchor) => void;
  designId?: string;
  versionId?: string;
  // Bidirectional navigation
  onBadgeClick?: (elementType: string, elementId: string) => void;
  highlightedElementKey?: string | null;
  showPins?: boolean;
}

export function PVLayoutRenderer({
  parsedData,
  showPanels = true,
  showBoundaries = true,
  showElectrical = false,
  showTrees = true,
  selectedPanelIndex,
  onPanelClick,
  elementCommentMode = false,
  onElementSelected,
  designId,
  versionId,
  onBadgeClick,
  highlightedElementKey,
  showPins = true,
}: PVLayoutRendererProps) {
  // Center offset to position layout at origin
  const centerOffset = useMemo(() => ({
    x: -parsedData.bounds.center[0],
    z: parsedData.bounds.center[1], // Flip Y to Z
  }), [parsedData.bounds.center]);

  return (
    <group position={[centerOffset.x, 0, centerOffset.z]}>
      {/* Solar Panels */}
      {showPanels && (
        <PanelInstances
          panels={parsedData.panels}
          selectedIndex={selectedPanelIndex}
          onPanelClick={onPanelClick}
          elementCommentMode={elementCommentMode}
          onElementSelected={onElementSelected}
        />
      )}

      {/* Boundaries and Areas */}
      {showBoundaries && (
        <BoundaryLines boundaries={parsedData.boundaries} />
      )}

      {/* Electrical Components - Lines (cables) */}
      {showElectrical && (
        <ElectricalLines electrical={parsedData.electrical} />
      )}

      {/* Electrical Components - 3D Equipment (inverters, transformers) */}
      {showElectrical && (
        <Equipment3D
          equipment={parsedData.electrical}
          elementCommentMode={elementCommentMode}
          onElementSelected={onElementSelected}
        />
      )}

      {/* Trees for shading visualization */}
      {showTrees && parsedData.trees && (
        <Tree3D trees={parsedData.trees} />
      )}

      {/* Element Comment Markers */}
      {designId && versionId && (
        <ElementCommentMarkers
          panels={parsedData.panels}
          electrical={parsedData.electrical}
          designId={designId}
          versionId={versionId}
          onBadgeClick={onBadgeClick}
          highlightedElementKey={highlightedElementKey}
          showPins={showPins}
        />
      )}
    </group>
  );
}

/**
 * BoundaryLines - Renders boundary polylines
 */
function BoundaryLines({ boundaries }: { boundaries: BoundaryGeometry[] }) {
  return (
    <group>
      {boundaries.map((boundary) => (
        <BoundaryLine key={boundary.id} boundary={boundary} />
      ))}
    </group>
  );
}

function BoundaryLine({ boundary }: { boundary: BoundaryGeometry }) {
  // Convert DXF coordinates to Three.js (flip Y to Z)
  const points = useMemo(() => {
    const pts = boundary.vertices.map((v): [number, number, number] => [
      v[0],
      v[2] + 0.1, // Slight elevation above ground
      -v[1],
    ]);

    // Close the shape if needed
    if (boundary.closed && pts.length > 2) {
      pts.push(pts[0]);
    }

    return pts;
  }, [boundary.vertices, boundary.closed]);

  // Color based on boundary type
  const color = useMemo(() => {
    switch (boundary.type) {
      case 'pv_area': return '#22c55e'; // Green
      case 'fence': return '#f59e0b'; // Orange
      case 'road': return '#6b7280'; // Gray
      case 'alignment': return '#3b82f6'; // Blue
      default: return '#a855f7'; // Purple
    }
  }, [boundary.type]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      dashed={boundary.type === 'alignment'}
    />
  );
}

/**
 * ElectricalLines - Renders electrical cable paths
 */
function ElectricalLines({ electrical }: { electrical: ElectricalComponent[] }) {
  // Filter to only show cable/string paths (those with vertices)
  const cables = useMemo(() =>
    electrical.filter((e) => e.vertices && e.vertices.length >= 2),
    [electrical]
  );

  return (
    <group>
      {cables.map((cable) => (
        <ElectricalLine key={cable.id} cable={cable} />
      ))}
    </group>
  );
}

function ElectricalLine({ cable }: { cable: ElectricalComponent }) {
  const points = useMemo(() => {
    if (!cable.vertices) return [];
    return cable.vertices.map((v): [number, number, number] => [
      v[0],
      v[2] + 0.15, // Slight elevation
      -v[1],
    ]);
  }, [cable.vertices]);

  // Color based on cable type
  const color = useMemo(() => {
    switch (cable.type) {
      case 'string': return '#ef4444'; // Red for DC strings
      case 'cable': return '#f97316'; // Orange for cables
      default: return '#8b5cf6'; // Purple
    }
  }, [cable.type]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1.5}
    />
  );
}

