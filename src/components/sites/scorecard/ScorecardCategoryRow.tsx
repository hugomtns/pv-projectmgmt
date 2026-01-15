import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  SCORECARD_CATEGORY_LABELS,
  SCORECARD_CATEGORY_DESCRIPTIONS,
  SCORECARD_RATING_LABELS,
} from '@/lib/constants';
import type { ScorecardCategory, ScorecardRating, CategoryScore } from '@/lib/types';

interface ScorecardCategoryRowProps {
  category: ScorecardCategory;
  score: CategoryScore;
  onChange: (rating: ScorecardRating, notes?: string) => void;
  disabled?: boolean;
}

const RATING_OPTIONS: Array<NonNullable<ScorecardRating>> = [1, 2, 3, 4, 5];

// Colors for rating buttons
const RATING_COLORS: Record<NonNullable<ScorecardRating>, string> = {
  1: '#ef4444', // red
  2: '#f97316', // orange
  3: '#eab308', // yellow
  4: '#84cc16', // lime
  5: '#22c55e', // green
};

export function ScorecardCategoryRow({
  category,
  score,
  onChange,
  disabled = false,
}: ScorecardCategoryRowProps) {
  const [showNotes, setShowNotes] = useState(!!score.notes);
  const [notes, setNotes] = useState(score.notes || '');

  const handleRatingClick = (rating: NonNullable<ScorecardRating>) => {
    onChange(rating, notes || undefined);
  };

  const handleNotesBlur = () => {
    if (score.rating !== null) {
      onChange(score.rating, notes || undefined);
    }
  };

  return (
    <div className="space-y-2 py-3 border-b last:border-b-0">
      {/* Category header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{SCORECARD_CATEGORY_LABELS[category]}</div>
          <div className="text-xs text-muted-foreground">
            {SCORECARD_CATEGORY_DESCRIPTIONS[category]}
          </div>
        </div>

        {/* Rating buttons */}
        <div className="flex gap-1 shrink-0">
          {RATING_OPTIONS.map((rating) => {
            const isSelected = score.rating === rating;
            const color = RATING_COLORS[rating];

            return (
              <Button
                key={rating}
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => handleRatingClick(rating)}
                className="w-8 h-8 p-0 text-xs font-medium transition-all"
                style={
                  isSelected
                    ? {
                        backgroundColor: color,
                        borderColor: color,
                        color: 'white',
                      }
                    : undefined
                }
                title={SCORECARD_RATING_LABELS[rating]}
              >
                {rating}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Notes toggle */}
      <button
        type="button"
        onClick={() => setShowNotes(!showNotes)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        disabled={disabled}
      >
        {showNotes ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {score.notes ? 'Edit notes' : 'Add notes'}
      </button>

      {/* Notes field */}
      {showNotes && (
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes about this rating..."
          rows={2}
          disabled={disabled}
          className="text-sm"
        />
      )}
    </div>
  );
}
