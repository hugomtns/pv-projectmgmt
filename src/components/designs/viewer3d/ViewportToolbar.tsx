import { Button } from '@/components/ui/button';
import { Box, Square, MessageSquarePlus, Eye, EyeOff, Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type CameraMode = '3d' | '2d';

// Visibility state for different layer types
export interface LayerVisibility {
  panels: boolean;
  boundaries: boolean;
  electrical: boolean;
  trees: boolean;
}

interface ViewportToolbarProps {
  mode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  elementCommentMode?: boolean;
  onElementCommentModeChange?: (enabled: boolean) => void;
  showPins?: boolean;
  onShowPinsChange?: (show: boolean) => void;
  visibility?: LayerVisibility;
  onVisibilityChange?: (visibility: LayerVisibility) => void;
}

/**
 * ViewportToolbar - Overlay controls for the 3D viewport
 * Provides toggle between 3D perspective and 2D top-down views
 * Also provides element comment mode toggle
 */
// Default visibility state
const defaultVisibility: LayerVisibility = {
  panels: true,
  boundaries: true,
  electrical: true,
  trees: true,
};

export function ViewportToolbar({
  mode,
  onModeChange,
  elementCommentMode = false,
  onElementCommentModeChange,
  showPins = true,
  onShowPinsChange,
  visibility = defaultVisibility,
  onVisibilityChange,
}: ViewportToolbarProps) {
  // Helper to toggle a single layer
  const toggleLayer = (layer: keyof LayerVisibility) => {
    onVisibilityChange?.({
      ...visibility,
      [layer]: !visibility[layer],
    });
  };

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

      {/* Layer Visibility Menu */}
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Layers className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle layer visibility</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Visibility</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={visibility.panels}
            onCheckedChange={() => toggleLayer('panels')}
          >
            Solar Panels
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={visibility.electrical}
            onCheckedChange={() => toggleLayer('electrical')}
          >
            Electrical Equipment
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={visibility.boundaries}
            onCheckedChange={() => toggleLayer('boundaries')}
          >
            Boundaries
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={visibility.trees}
            onCheckedChange={() => toggleLayer('trees')}
          >
            Trees
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
          <TooltipContent side="bottom">
            {elementCommentMode
              ? 'Click an element to add a comment. Press Escape to cancel.'
              : 'Add a comment to a design element'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Show/Hide Comment Pins */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={showPins ? 'ghost' : 'default'}
              onClick={() => onShowPinsChange?.(!showPins)}
            >
              {showPins ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {showPins ? 'Hide comment pins' : 'Show comment pins'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
