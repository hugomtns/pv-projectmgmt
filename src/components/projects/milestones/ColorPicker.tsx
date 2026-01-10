import { MILESTONE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {MILESTONE_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={cn(
            'w-8 h-8 rounded-full border-2 transition-all',
            value === color.value
              ? 'border-foreground ring-2 ring-offset-2 ring-foreground'
              : 'border-border hover:border-foreground'
          )}
          style={{ backgroundColor: color.value }}
          title={color.name}
        />
      ))}
    </div>
  );
}
