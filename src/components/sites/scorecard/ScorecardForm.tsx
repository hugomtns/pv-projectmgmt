import { ScorecardCategoryRow } from './ScorecardCategoryRow';
import { ScorecardBadge } from './ScorecardBadge';
import { useSiteStore } from '@/stores/siteStore';
import type { Site, ScorecardCategory, ScorecardRating } from '@/lib/types';

interface ScorecardFormProps {
  site: Site;
  disabled?: boolean;
}

const CATEGORIES: ScorecardCategory[] = ['grid', 'access', 'land', 'environmental'];

export function ScorecardForm({ site, disabled = false }: ScorecardFormProps) {
  const initializeScorecard = useSiteStore((state) => state.initializeScorecard);
  const updateCategoryScore = useSiteStore((state) => state.updateCategoryScore);

  // Initialize scorecard if it doesn't exist
  const handleInitialize = () => {
    initializeScorecard(site.id);
  };

  const handleCategoryChange = (
    category: ScorecardCategory,
    rating: ScorecardRating,
    notes?: string
  ) => {
    updateCategoryScore(site.id, category, rating, notes);
  };

  // If no scorecard, show initialization prompt
  if (!site.scorecard) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-4">
          No scorecard has been created for this site yet.
        </p>
        <button
          onClick={handleInitialize}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          Initialize Scorecard
        </button>
      </div>
    );
  }

  const { scorecard } = site;

  return (
    <div className="space-y-4">
      {/* Header with live score preview */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Site Selection Scorecard</h4>
        <ScorecardBadge scorecard={scorecard} />
      </div>

      {/* Usable Area (read-only) */}
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">Usable Area</div>
            <div className="text-xs text-muted-foreground">
              Auto-calculated from site boundaries and exclusion zones
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {scorecard.usableAreaPercent}%
          </div>
        </div>
        {site.totalArea != null && site.usableArea != null && (
          <div className="text-xs text-muted-foreground mt-2">
            {(site.usableArea / 4047).toFixed(1)} usable acres of{' '}
            {(site.totalArea / 4047).toFixed(1)} total acres
          </div>
        )}
      </div>

      {/* Category ratings */}
      <div className="space-y-1">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Manual Ratings
        </div>
        {CATEGORIES.map((category) => (
          <ScorecardCategoryRow
            key={category}
            category={category}
            score={scorecard.categories[category]}
            onChange={(rating, notes) => handleCategoryChange(category, rating, notes)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Score explanation */}
      <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
        <strong>Scoring:</strong> Composite score (0-100) is a weighted average of usable area
        (20%) and manual ratings: Grid (25%), Access (15%), Land (20%), Environmental (20%).
        Traffic light: Red (0-40), Yellow (40-70), Green (70-100).
      </div>
    </div>
  );
}
