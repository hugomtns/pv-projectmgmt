/**
 * Equipment3D - Renders 3D electrical equipment (inverters, transformers, etc.)
 */

import { useMemo, useState, useCallback } from 'react';
import { DoubleSide } from 'three';
import type { ElectricalComponent } from '@/lib/dxf/types';
import type { ElementAnchor, CommentableElementType } from '@/lib/types';
import {
  createTransformerTexture,
  createInverterTexture,
  createCombinerTexture,
} from './proceduralTextures';

interface Equipment3DProps {
  equipment: ElectricalComponent[];
  elementCommentMode?: boolean;
  onElementSelected?: (element: ElementAnchor) => void;
}

// Default dimensions if not provided (realistic sizes in meters)
const DEFAULT_DIMS = {
  // String inverter - small box mounted on structure
  inverter: { width: 0.5, height: 0.6, depth: 0.25 },
  // Pad-mounted transformer - large rectangular equipment (not cubic)
  transformer: { width: 4.0, height: 3.0, depth: 2.0 },
  // Combiner box - small electrical enclosure
  combiner: { width: 0.6, height: 0.8, depth: 0.3 },
  default: { width: 1.0, height: 1.0, depth: 1.0 },
};

export function Equipment3D({
  equipment,
  elementCommentMode = false,
  onElementSelected,
}: Equipment3DProps) {
  // Filter to only 3D equipment (inverters, transformers, combiners)
  const equipment3D = useMemo(() =>
    equipment.filter(e =>
      e.type === 'inverter' ||
      e.type === 'transformer' ||
      e.type === 'combiner'
    ),
    [equipment]
  );

  if (equipment3D.length === 0) return null;

  return (
    <group>
      {equipment3D.map((item) => (
        <EquipmentBox
          key={item.id}
          equipment={item}
          elementCommentMode={elementCommentMode}
          onElementSelected={onElementSelected}
        />
      ))}
    </group>
  );
}

interface EquipmentBoxProps {
  equipment: ElectricalComponent;
  elementCommentMode?: boolean;
  onElementSelected?: (element: ElementAnchor) => void;
}

function EquipmentBox({
  equipment,
  elementCommentMode = false,
  onElementSelected,
}: EquipmentBoxProps) {
  const [hovered, setHovered] = useState(false);

  // Get dimensions
  const dims = useMemo(() => {
    const defaults = DEFAULT_DIMS[equipment.type as keyof typeof DEFAULT_DIMS] || DEFAULT_DIMS.default;
    return {
      width: equipment.width || defaults.width,
      height: equipment.height || defaults.height,
      depth: equipment.depth || defaults.depth,
    };
  }, [equipment]);

  // Get procedural canvas texture based on equipment type
  const texture = useMemo(() => {
    switch (equipment.type) {
      case 'transformer': return createTransformerTexture();
      case 'inverter':    return createInverterTexture();
      case 'combiner':    return createCombinerTexture();
      default:            return createInverterTexture();
    }
  }, [equipment.type]);

  // Position: DXF X,Y -> Three.js X,Z (Y negated), height centered
  // Transformers need an offset because their INSERT point is offset from center
  // Based on analysis: transformer INSERT is ~4.5m left and ~7m behind cable connection point
  const isTransformer = equipment.type === 'transformer';
  const position: [number, number, number] = [
    equipment.position[0] + (isTransformer ? 4.5 : 0),
    dims.height / 2, // Center height
    -equipment.position[1] + (isTransformer ? 7 : 0),
  ];

  // Handle click for element selection
  const handleClick = useCallback((e: { stopPropagation: () => void }) => {
    if (!elementCommentMode || !onElementSelected) return;
    e.stopPropagation();

    // Get element label
    const typeName = equipment.type.charAt(0).toUpperCase() + equipment.type.slice(1);
    const label = equipment.label || `${typeName} ${equipment.id.slice(0, 8)}`;

    onElementSelected({
      elementType: equipment.type as CommentableElementType,
      elementId: equipment.id,
      elementLabel: label,
    });
  }, [elementCommentMode, onElementSelected, equipment]);

  // Handle hover
  const handlePointerEnter = useCallback(() => {
    if (elementCommentMode) setHovered(true);
  }, [elementCommentMode]);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
  }, []);

  return (
    <group position={position}>
      {/* Main box */}
      <mesh
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <boxGeometry args={[dims.width, dims.height, dims.depth]} />
        <meshStandardMaterial
          map={texture}
          color="#ffffff"
          metalness={0.3}
          roughness={0.6}
          side={DoubleSide}
        />
      </mesh>

      {/* Wireframe outline */}
      <mesh>
        <boxGeometry args={[dims.width * 1.01, dims.height * 1.01, dims.depth * 1.01]} />
        <meshBasicMaterial
          color="#000000"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Hover highlight in comment mode */}
      {elementCommentMode && hovered && (
        <mesh>
          <boxGeometry args={[dims.width * 1.1, dims.height * 1.1, dims.depth * 1.1]} />
          <meshBasicMaterial
            color="#f97316"
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
