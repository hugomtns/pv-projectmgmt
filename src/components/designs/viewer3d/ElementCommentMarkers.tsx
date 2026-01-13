/**
 * ElementCommentMarkers - Renders visual indicators on elements that have comments
 *
 * Uses @react-three/drei Html component to render DOM elements in 3D space.
 * Shows comment count badges on panels and equipment that have associated comments.
 */

import { useEffect, useState, useMemo } from 'react';
import { Html } from '@react-three/drei';
import { cn } from '@/lib/utils';
import { useDesignStore } from '@/stores/designStore';
import type { PanelGeometry, ElectricalComponent } from '@/lib/dxf/types';

// Default dimensions for calculating marker positions
const DEFAULT_TABLE_WIDTH = 16.0;
const DEFAULT_TABLE_HEIGHT = 4.5;
const DEFAULT_TILT_ANGLE = 20;

interface ElementCommentMarkersProps {
  panels: PanelGeometry[];
  electrical: ElectricalComponent[];
  designId: string;
  versionId: string;
  onBadgeClick?: (elementType: string, elementId: string) => void;
  highlightedElementKey?: string | null;
  showPins?: boolean;
}

interface ElementWithComments {
  elementType: string;
  elementId: string;
  count: number;
  hasUnresolved: boolean;
}

export function ElementCommentMarkers({
  panels,
  electrical,
  designId,
  versionId,
  onBadgeClick,
  highlightedElementKey,
  showPins = true,
}: ElementCommentMarkersProps) {
  const [elementsWithComments, setElementsWithComments] = useState<ElementWithComments[]>([]);
  const getElementsWithComments = useDesignStore((state) => state.getElementsWithComments);

  // Load elements with comments
  useEffect(() => {
    const loadElements = async () => {
      try {
        const elements = await getElementsWithComments(designId, versionId);
        setElementsWithComments(elements);
      } catch (e) {
        console.error('Failed to load elements with comments:', e);
      }
    };

    loadElements();

    // Refresh every 5 seconds to catch new comments
    const interval = setInterval(loadElements, 5000);
    return () => clearInterval(interval);
  }, [designId, versionId, getElementsWithComments]);

  // Create a lookup map for quick access
  const commentsMap = useMemo(() => {
    const map = new Map<string, ElementWithComments>();
    for (const element of elementsWithComments) {
      const key = `${element.elementType}:${element.elementId}`;
      map.set(key, element);
    }
    return map;
  }, [elementsWithComments]);

  if (!showPins || elementsWithComments.length === 0) return null;

  return (
    <group>
      {/* Panel markers */}
      {panels.map((panel, index) => {
        const key = `panel:${index}`;
        const comments = commentsMap.get(key);
        if (!comments) return null;

        return (
          <PanelCommentMarker
            key={key}
            panel={panel}
            count={comments.count}
            hasUnresolved={comments.hasUnresolved}
            isHighlighted={highlightedElementKey === key}
            onClick={() => onBadgeClick?.('panel', String(index))}
          />
        );
      })}

      {/* Equipment markers */}
      {electrical
        .filter((e) => e.type === 'inverter' || e.type === 'transformer' || e.type === 'combiner')
        .map((equipment) => {
          const key = `${equipment.type}:${equipment.id}`;
          const comments = commentsMap.get(key);
          if (!comments) return null;

          return (
            <EquipmentCommentMarker
              key={key}
              equipment={equipment}
              count={comments.count}
              hasUnresolved={comments.hasUnresolved}
              isHighlighted={highlightedElementKey === key}
              onClick={() => onBadgeClick?.(equipment.type, equipment.id)}
            />
          );
        })}
    </group>
  );
}

/**
 * Panel Comment Marker
 */
function PanelCommentMarker({
  panel,
  count,
  hasUnresolved,
  isHighlighted,
  onClick,
}: {
  panel: PanelGeometry;
  count: number;
  hasUnresolved: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}) {
  const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
  const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
  const mountingHeight = panel.mountingHeight || panel.position[2] || 0.8;
  const tiltAngle = panel.tiltAngle || DEFAULT_TILT_ANGLE;
  const tiltRad = (tiltAngle * Math.PI) / 180;
  const centerHeight = mountingHeight + (tableHeight / 2) * Math.sin(tiltRad);

  // Calculate the offset to center (same as in PanelInstances)
  const halfWidth = tableWidth / 2;
  const halfDepth = (tableHeight / 2) * Math.cos(tiltRad);
  const azimuth = panel.rotation;
  const offsetX = halfWidth * Math.cos(azimuth) + halfDepth * Math.sin(azimuth);
  const offsetY = halfWidth * Math.sin(azimuth) - halfDepth * Math.cos(azimuth);

  // Position marker slightly above and to the side
  const position: [number, number, number] = [
    panel.position[0] + offsetX + tableWidth * 0.4,
    centerHeight + 1.5,
    -(panel.position[1] + offsetY),
  ];

  return (
    <Html position={position} center distanceFactor={12} zIndexRange={[100, 0]}>
      <CommentBadge count={count} hasUnresolved={hasUnresolved} isHighlighted={isHighlighted} onClick={onClick} />
    </Html>
  );
}

/**
 * Equipment Comment Marker
 */
function EquipmentCommentMarker({
  equipment,
  count,
  hasUnresolved,
  isHighlighted,
  onClick,
}: {
  equipment: ElectricalComponent;
  count: number;
  hasUnresolved: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}) {
  // Get equipment height for marker positioning
  const defaultHeight =
    equipment.type === 'transformer' ? 3.0 :
    equipment.type === 'inverter' ? 0.6 : 0.8;
  const height = equipment.height || defaultHeight;

  // Apply transformer offset (same as in Equipment3D)
  const isTransformer = equipment.type === 'transformer';
  const position: [number, number, number] = [
    equipment.position[0] + (isTransformer ? 4.5 : 0),
    height + 1.5, // Above equipment
    -equipment.position[1] + (isTransformer ? 7 : 0),
  ];

  return (
    <Html position={position} center distanceFactor={12} zIndexRange={[100, 0]}>
      <CommentBadge count={count} hasUnresolved={hasUnresolved} isHighlighted={isHighlighted} onClick={onClick} />
    </Html>
  );
}

/**
 * Comment Badge Component (DOM)
 * Base size 60px, scales with distance via distanceFactor on Html component
 */
function CommentBadge({
  count,
  hasUnresolved,
  isHighlighted,
  onClick,
}: {
  count: number;
  hasUnresolved: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      style={{
        width: '60px',
        height: '60px',
        fontSize: '28px',
      }}
      className={cn(
        'flex items-center justify-center rounded-full font-bold shadow-2xl cursor-pointer select-none',
        'transition-all hover:scale-110',
        'border-4',
        hasUnresolved
          ? 'bg-yellow-500 text-yellow-900 ring-4 ring-yellow-300 ring-offset-2 border-yellow-600'
          : 'bg-green-500 text-green-900 ring-4 ring-green-300 ring-offset-2 border-green-600',
        isHighlighted && 'animate-pulse scale-125 ring-8'
      )}
      onClick={onClick}
    >
      {count}
    </div>
  );
}
