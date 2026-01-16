/**
 * EquipmentStatusOverlay - Shows real-time status indicators on 3D equipment
 *
 * Renders status rings, glow effects, and metric badges on inverters and
 * transformers based on Digital Twin telemetry data.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';
import type { ElectricalComponent } from '@/lib/dxf/types';
import type {
  TelemetrySnapshot,
  InverterTelemetry,
  TransformerTelemetry,
  EquipmentStatus,
} from '@/lib/digitaltwin/types';
import { EQUIPMENT_STATUS_COLORS } from '@/lib/digitaltwin/types';
import { cn } from '@/lib/utils';

interface EquipmentStatusOverlayProps {
  equipment: ElectricalComponent[];
  telemetry: TelemetrySnapshot | null;
  showMetrics?: boolean;
}

// Default equipment dimensions (must match Equipment3D)
const DEFAULT_DIMS = {
  inverter: { width: 0.5, height: 0.6, depth: 0.25 },
  transformer: { width: 4.0, height: 3.0, depth: 2.0 },
  combiner: { width: 0.6, height: 0.8, depth: 0.3 },
  default: { width: 1.0, height: 1.0, depth: 1.0 },
};

export function EquipmentStatusOverlay({
  equipment,
  telemetry,
  showMetrics = true,
}: EquipmentStatusOverlayProps) {
  // Filter to only 3D equipment
  const equipment3D = useMemo(
    () =>
      equipment.filter(
        (e) =>
          e.type === 'inverter' ||
          e.type === 'transformer' ||
          e.type === 'combiner'
      ),
    [equipment]
  );

  // Create lookup maps for telemetry
  const inverterMap = useMemo(() => {
    const map = new Map<string, InverterTelemetry>();
    telemetry?.inverters.forEach((inv, index) => {
      // Map by index since we match equipment array order
      map.set(`inv-${index}`, inv);
    });
    return map;
  }, [telemetry]);

  const transformerMap = useMemo(() => {
    const map = new Map<string, TransformerTelemetry>();
    telemetry?.transformers.forEach((xfr, index) => {
      map.set(`xfr-${index}`, xfr);
    });
    return map;
  }, [telemetry]);

  if (!telemetry || equipment3D.length === 0) return null;

  // Separate by type and maintain order
  const inverters = equipment3D.filter((e) => e.type === 'inverter');
  const transformers = equipment3D.filter((e) => e.type === 'transformer');

  return (
    <group>
      {/* Inverter status overlays */}
      {inverters.map((item, index) => {
        const inv = inverterMap.get(`inv-${index}`);
        if (!inv) return null;

        return (
          <EquipmentStatusIndicator
            key={`inv-status-${index}`}
            equipment={item}
            status={inv.status}
            metrics={
              showMetrics
                ? { power: inv.acPower, temp: inv.temperature }
                : undefined
            }
          />
        );
      })}

      {/* Transformer status overlays */}
      {transformers.map((item, index) => {
        const xfr = transformerMap.get(`xfr-${index}`);
        if (!xfr) return null;

        return (
          <EquipmentStatusIndicator
            key={`xfr-status-${index}`}
            equipment={item}
            status={xfr.status}
            metrics={
              showMetrics
                ? { load: xfr.loadPercent, temp: xfr.temperature }
                : undefined
            }
          />
        );
      })}
    </group>
  );
}

interface EquipmentStatusIndicatorProps {
  equipment: ElectricalComponent;
  status: EquipmentStatus;
  metrics?: {
    power?: number;
    load?: number;
    temp?: number;
  };
}

function EquipmentStatusIndicator({
  equipment,
  status,
  metrics,
}: EquipmentStatusIndicatorProps) {
  const dims =
    DEFAULT_DIMS[equipment.type as keyof typeof DEFAULT_DIMS] ||
    DEFAULT_DIMS.default;

  // Position: match Equipment3D positioning
  const isTransformer = equipment.type === 'transformer';
  const position: [number, number, number] = [
    equipment.position[0] + (isTransformer ? 4.5 : 0),
    dims.height + 0.5, // Above equipment
    -equipment.position[1] + (isTransformer ? 7 : 0),
  ];

  const color = EQUIPMENT_STATUS_COLORS[status];

  return (
    <group position={position}>
      {/* Status ring */}
      <StatusRing color={color} status={status} />

      {/* Pulsing glow for fault state */}
      {status === 'fault' && <PulsingGlow color={color} />}

      {/* Metrics badge */}
      {metrics && (
        <Html position={[0, 0.8, 0]} center distanceFactor={15} zIndexRange={[100, 0]}>
          <MetricsBadge status={status} metrics={metrics} />
        </Html>
      )}
    </group>
  );
}

interface StatusRingProps {
  color: string;
  status: EquipmentStatus;
}

function StatusRing({ color, status }: StatusRingProps) {
  const ringRef = useRef<Mesh>(null);

  // Animate ring for fault/warning states
  useFrame(() => {
    if (!ringRef.current) return;

    if (status === 'fault') {
      // Pulse the ring for faults
      const scale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
      ringRef.current.scale.setScalar(scale);
    } else if (status === 'warning') {
      // Gentle pulse for warnings
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.05;
      ringRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.4, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={status === 'offline' ? 0.4 : 0.8}
      />
    </mesh>
  );
}

interface PulsingGlowProps {
  color: string;
}

function PulsingGlow({ color }: PulsingGlowProps) {
  const glowRef = useRef<Mesh>(null);

  useFrame(() => {
    if (!glowRef.current) return;

    // Pulsing effect
    const intensity = 0.5 + Math.sin(Date.now() * 0.008) * 0.3;
    (glowRef.current.material as any).opacity = intensity;

    const scale = 1 + Math.sin(Date.now() * 0.006) * 0.2;
    glowRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.6, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
}

interface MetricsBadgeProps {
  status: EquipmentStatus;
  metrics: {
    power?: number;
    load?: number;
    temp?: number;
  };
}

function MetricsBadge({ status, metrics }: MetricsBadgeProps) {
  const statusColors: Record<EquipmentStatus, string> = {
    online: 'bg-green-500/90',
    warning: 'bg-yellow-500/90',
    fault: 'bg-red-500/90',
    offline: 'bg-gray-500/90',
  };

  return (
    <div
      className={cn(
        'px-2 py-1 rounded-md text-xs font-medium text-white shadow-lg pointer-events-none',
        'flex flex-col items-center gap-0.5 min-w-[60px]',
        statusColors[status]
      )}
    >
      {metrics.power !== undefined && (
        <div className="whitespace-nowrap">
          {metrics.power > 0 ? metrics.power.toFixed(1) : '0'} kW
        </div>
      )}
      {metrics.load !== undefined && (
        <div className="whitespace-nowrap">{metrics.load.toFixed(0)}% load</div>
      )}
      {metrics.temp !== undefined && (
        <div className="whitespace-nowrap text-[10px] opacity-80">
          {metrics.temp.toFixed(0)}°C
        </div>
      )}
    </div>
  );
}
