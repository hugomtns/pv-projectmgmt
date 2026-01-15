import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  SCORECARD_CATEGORY_LABELS,
  SCORECARD_RATING_LABELS,
  SCORECARD_TRAFFIC_LIGHT_COLORS,
  SCORECARD_TRAFFIC_LIGHT_LABELS,
} from '@/lib/constants';
import type { SiteScorecard, ScorecardCategory, ScorecardRating } from '@/lib/types';
import { getTrafficLightColor, isScorecardComplete } from '@/lib/types/siteScorecard';

interface ScorecardBadgeProps {
  scorecard: SiteScorecard | undefined;
  size?: 'sm' | 'md';
}

export function ScorecardBadge({ scorecard, size = 'md' }: ScorecardBadgeProps) {
  // No scorecard initialized
  if (!scorecard) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium bg-muted text-muted-foreground ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
        Not rated
      </span>
    );
  }

  const isComplete = isScorecardComplete(scorecard);
  const trafficLight = getTrafficLightColor(scorecard.compositeScore);

  // Incomplete scorecard
  if (!isComplete || scorecard.compositeScore === null) {
    const ratedCount = Object.values(scorecard.categories).filter(
      (c) => c.rating !== null
    ).length;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium bg-muted text-muted-foreground ${
                size === 'sm' ? 'text-xs' : 'text-sm'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
              {ratedCount}/4 rated
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <ScorecardTooltipContent scorecard={scorecard} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Complete scorecard with traffic light
  const color = trafficLight ? SCORECARD_TRAFFIC_LIGHT_COLORS[trafficLight] : '#6b7280';
  const label = trafficLight ? SCORECARD_TRAFFIC_LIGHT_LABELS[trafficLight] : 'Unknown';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium ${
              size === 'sm' ? 'text-xs' : 'text-sm'
            }`}
            style={{
              backgroundColor: `${color}20`,
              color: color,
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {scorecard.compositeScore} ({label})
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <ScorecardTooltipContent scorecard={scorecard} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ScorecardTooltipContent({ scorecard }: { scorecard: SiteScorecard }) {
  const categories: ScorecardCategory[] = ['grid', 'access', 'land', 'environmental'];

  const getRatingLabel = (rating: ScorecardRating): string => {
    if (rating === null) return 'Not rated';
    return `${rating}/5 (${SCORECARD_RATING_LABELS[rating]})`;
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="font-medium border-b pb-1">Site Scorecard</div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Usable Area</span>
        <span>{scorecard.usableAreaPercent}%</span>
      </div>
      {categories.map((cat) => (
        <div key={cat} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{SCORECARD_CATEGORY_LABELS[cat]}</span>
          <span>{getRatingLabel(scorecard.categories[cat].rating)}</span>
        </div>
      ))}
      {scorecard.compositeScore !== null && (
        <div className="flex justify-between gap-4 border-t pt-1 font-medium">
          <span>Composite Score</span>
          <span>{scorecard.compositeScore}/100</span>
        </div>
      )}
    </div>
  );
}
