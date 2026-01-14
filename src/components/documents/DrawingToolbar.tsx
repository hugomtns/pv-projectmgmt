import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from '@/components/ui/color-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MousePointer2,
  Square,
  Circle,
  ArrowRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import { DRAWING_COLORS } from '@/lib/constants';

export type DrawingTool = 'select' | 'rectangle' | 'circle' | 'arrow' | 'freehand';
export type DrawingColor = string;
export type StrokeWidth = 2 | 4 | 7;

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  activeColor: DrawingColor;
  activeStrokeWidth: StrokeWidth;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: DrawingColor) => void;
  onStrokeWidthChange: (width: StrokeWidth) => void;
  onClearAll: () => void;
}

const STROKE_WIDTHS: StrokeWidth[] = [2, 4, 7];

const TOOLS: Array<{ tool: DrawingTool; icon: React.ReactNode; label: string }> = [
  { tool: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select' },
  { tool: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
  { tool: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
  { tool: 'arrow', icon: <ArrowRight className="h-4 w-4" />, label: 'Arrow' },
  { tool: 'freehand', icon: <Pencil className="h-4 w-4" />, label: 'Freehand' },
];

export function DrawingToolbar({
  activeTool,
  activeColor,
  activeStrokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onClearAll,
}: DrawingToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 p-2 bg-muted/50 border-b border-border">
        {/* Tool Selection */}
        <div className="flex items-center gap-1">
          {TOOLS.map(({ tool, icon, label }) => (
            <Tooltip key={tool}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === tool ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onToolChange(tool)}
                  className="h-8 w-8 p-0"
                >
                  {icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Color Picker */}
        <ColorPicker
          value={activeColor}
          onChange={onColorChange}
          colors={[...DRAWING_COLORS]}
          size="sm"
          className="gap-1"
        />

        <Separator orientation="vertical" className="h-8" />

        {/* Stroke Width */}
        <div className="flex items-center gap-1">
          {STROKE_WIDTHS.map((width) => (
            <Tooltip key={width}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeStrokeWidth === width ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onStrokeWidthChange(width)}
                  className="h-8 px-3"
                >
                  <div
                    className="rounded-full bg-current"
                    style={{
                      width: `${width * 2}px`,
                      height: `${width * 2}px`,
                    }}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{width}px stroke</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Clear All */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-8 gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear all drawings</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
