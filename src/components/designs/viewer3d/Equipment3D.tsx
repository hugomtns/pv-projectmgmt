/**
 * Equipment3D - Renders 3D electrical equipment (inverters, transformers, etc.)
 */

import { useMemo } from 'react';
import { Color, DoubleSide } from 'three';
import type { ElectricalComponent } from '@/lib/dxf/types';

interface Equipment3DProps {
  equipment: ElectricalComponent[];
}

// Equipment colors
const INVERTER_COLOR = new Color('#059669'); // Green
const TRANSFORMER_COLOR = new Color('#7c3aed'); // Purple
const COMBINER_COLOR = new Color('#ea580c'); // Orange
const DEFAULT_COLOR = new Color('#6b7280'); // Gray

// Default dimensions if not provided
const DEFAULT_DIMS = {
  inverter: { width: 6.0, height: 2.5, depth: 2.0 },
  transformer: { width: 3.0, height: 2.5, depth: 2.5 },
  combiner: { width: 0.6, height: 1.2, depth: 0.3 },
  default: { width: 1.0, height: 1.0, depth: 1.0 },
};

export function Equipment3D({ equipment }: Equipment3DProps) {
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
        <EquipmentBox key={item.id} equipment={item} />
      ))}
    </group>
  );
}

function EquipmentBox({ equipment }: { equipment: ElectricalComponent }) {
  // Get dimensions
  const dims = useMemo(() => {
    const defaults = DEFAULT_DIMS[equipment.type as keyof typeof DEFAULT_DIMS] || DEFAULT_DIMS.default;
    return {
      width: equipment.width || defaults.width,
      height: equipment.height || defaults.height,
      depth: equipment.depth || defaults.depth,
    };
  }, [equipment]);

  // Get color based on type
  const color = useMemo(() => {
    switch (equipment.type) {
      case 'inverter': return INVERTER_COLOR;
      case 'transformer': return TRANSFORMER_COLOR;
      case 'combiner': return COMBINER_COLOR;
      default: return DEFAULT_COLOR;
    }
  }, [equipment.type]);

  // Position: DXF X,Y -> Three.js X,Z (Y negated), height centered
  const position: [number, number, number] = [
    equipment.position[0],
    dims.height / 2, // Center height
    -equipment.position[1],
  ];

  return (
    <group position={position}>
      {/* Main box */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dims.width, dims.height, dims.depth]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.7}
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

      {/* Label (optional - could add Html label here) */}
    </group>
  );
}
