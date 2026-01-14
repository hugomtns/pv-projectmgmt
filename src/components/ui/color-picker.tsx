import { cn } from '@/lib/utils';

interface ColorOption {
  value: string;
  name?: string;
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  /** Array of color options - can be strings or { value, name } objects */
  colors: (string | ColorOption)[];
  /** Size of color swatches */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className for the container */
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

function normalizeColor(color: string | ColorOption): ColorOption {
  if (typeof color === 'string') {
    return { value: color };
  }
  return color;
}

export function ColorPicker({
  value,
  onChange,
  colors,
  size = 'md',
  className,
}: ColorPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {colors.map((color) => {
        const { value: colorValue, name } = normalizeColor(color);
        const isSelected = value === colorValue;
        const isLight = colorValue.toUpperCase() === '#FFFFFF';

        return (
          <button
            key={colorValue}
            type="button"
            onClick={() => onChange(colorValue)}
            className={cn(
              'rounded-full border-2 transition-all',
              sizeClasses[size],
              isSelected
                ? 'border-primary ring-2 ring-offset-2 ring-primary scale-110'
                : 'border-border hover:border-foreground hover:scale-105'
            )}
            style={{
              backgroundColor: colorValue,
              boxShadow: isLight ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : undefined,
            }}
            title={name || colorValue}
            aria-label={name || `Color ${colorValue}`}
            aria-pressed={isSelected}
          />
        );
      })}
    </div>
  );
}
