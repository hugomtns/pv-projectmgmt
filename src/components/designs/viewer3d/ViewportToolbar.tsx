import { Button } from '@/components/ui/button';
import { Box, Square } from 'lucide-react';

type CameraMode = '3d' | '2d';

interface ViewportToolbarProps {
  mode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
}

/**
 * ViewportToolbar - Overlay controls for the 3D viewport
 * Provides toggle between 3D perspective and 2D top-down views
 */
export function ViewportToolbar({ mode, onModeChange }: ViewportToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border shadow-sm">
      <Button
        size="sm"
        variant={mode === '3d' ? 'default' : 'ghost'}
        onClick={() => onModeChange('3d')}
        className="gap-2"
      >
        <Box className="h-4 w-4" />
        3D
      </Button>
      <Button
        size="sm"
        variant={mode === '2d' ? 'default' : 'ghost'}
        onClick={() => onModeChange('2d')}
        className="gap-2"
      >
        <Square className="h-4 w-4" />
        2D
      </Button>
    </div>
  );
}
