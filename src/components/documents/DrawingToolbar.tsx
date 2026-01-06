import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  MousePointer2,
  Square,
  Circle,
  ArrowRight,
  Pencil,
  Type,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DrawingTool = 'select' | 'rectangle' | 'circle' | 'arrow' | 'freehand' | 'text';
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

const PRESET_COLORS: DrawingColor[] = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#000000', // black
  '#FFFFFF', // white
];

const STROKE_WIDTHS: StrokeWidth[] = [2, 4, 7];

const TOOLS: Array<{ tool: DrawingTool; icon: React.ReactNode; label: string }> = [
  { tool: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select' },
  { tool: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
  { tool: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
  { tool: 'arrow', icon: <ArrowRight className="h-4 w-4" />, label: 'Arrow' },
  { tool: 'freehand', icon: <Pencil className="h-4 w-4" />, label: 'Freehand' },
  { tool: 'text', icon: <Type className="h-4 w-4" />, label: 'Text' },
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
    <div className="flex items-center gap-2 p-2 bg-muted/50 border-b border-border">
      {/* Tool Selection */}
      <div className="flex items-center gap-1">
        {TOOLS.map(({ tool, icon, label }) => (
          <Button
            key={tool}
            variant={activeTool === tool ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange(tool)}
            title={label}
            className="h-8 w-8 p-0"
          >
            {icon}
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Color Picker */}
      <div className="flex items-center gap-1">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={cn(
              'h-6 w-6 rounded border-2 transition-all',
              activeColor === color
                ? 'border-primary scale-110'
                : 'border-border hover:scale-105'
            )}
            style={{
              backgroundColor: color,
              boxShadow: color === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : undefined,
            }}
            title={color}
          />
        ))}
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Stroke Width */}
      <div className="flex items-center gap-1">
        {STROKE_WIDTHS.map((width) => (
          <Button
            key={width}
            variant={activeStrokeWidth === width ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onStrokeWidthChange(width)}
            title={`${width}px`}
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
        ))}
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Clear All */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-8 gap-2 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Clear All
      </Button>
    </div>
  );
}
