/**
 * PanelHeatmap - Shows performance-based color overlay on panel zones
 *
 * NOTE: This component is deprecated. Performance coloring is now applied
 * directly to individual panels in PanelInstances.tsx using the panelFrames
 * telemetry data. This file is kept for reference only.
 */

import type { PanelGeometry } from '@/lib/dxf/types';
import type { PanelFramePerformance } from '@/lib/digitaltwin/types';

interface PanelHeatmapProps {
  panels: PanelGeometry[];
  panelZones: PanelFramePerformance[] | undefined;
  enabled?: boolean;
}

/**
 * @deprecated Performance colors are now applied directly to panel instances.
 * This component is kept for backward compatibility but does nothing.
 */
export function PanelHeatmap({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  panels: _panels,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  panelZones: _panelZones,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enabled: _enabled = true,
}: PanelHeatmapProps) {
  // Performance coloring is now handled directly in PanelInstances.tsx
  // This component is kept for backward compatibility but does nothing.
  return null;
}
