import { Button } from '@/components/ui/button';
import { Box, Square, MessageSquarePlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CameraMode = '3d' | '2d';

interface ViewportToolbarProps {
  mode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  elementCommentMode?: boolean;
  onElementCommentModeChange?: (enabled: boolean) => void;
}

/**
 * ViewportToolbar - Overlay controls for the 3D viewport
 * Provides toggle between 3D perspective and 2D top-down views
 * Also provides element comment mode toggle
 */
export function ViewportToolbar({
  mode,
  onModeChange,
  elementCommentMode = false,
  onElementCommentModeChange,
}: ViewportToolbarProps) {
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

      {/* Separator */}
      <div className="w-px h-6 bg-border mx-1 self-center" />

      {/* Element Comment Mode Toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={elementCommentMode ? 'default' : 'ghost'}
              onClick={() => onElementCommentModeChange?.(!elementCommentMode)}
              className="gap-2"
            >
              <MessageSquarePlus className="h-4 w-4" />
              {elementCommentMode ? 'Click Element' : 'Comment'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {elementCommentMode
              ? 'Click an element to add a comment. Press Escape to cancel.'
              : 'Add a comment to a design element'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
