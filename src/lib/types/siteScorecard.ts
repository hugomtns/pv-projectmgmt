/**
 * Site Selection Scorecard Types
 *
 * Semi-automated scoring system for site evaluation combining:
 * - Auto-calculated metrics (usable area %)
 * - Manual ratings for key categories (1-5 scale)
 * - Composite score (0-100) with traffic light visualization
 */

/** Scorecard category identifiers */
export type ScorecardCategory = 'grid' | 'access' | 'land' | 'environmental';

/** Rating scale 1-5 (null means not yet rated) */
export type ScorecardRating = 1 | 2 | 3 | 4 | 5 | null;

/** Individual category score with optional notes */
export interface CategoryScore {
  rating: ScorecardRating;
  notes?: string;
  updatedAt?: string; // ISO timestamp
  updatedBy?: string; // User ID
}

/** Traffic light color based on composite score */
export type TrafficLightColor = 'red' | 'yellow' | 'green';

/** Complete scorecard for a site */
export interface SiteScorecard {
  /** Auto-calculated from site's usableArea / totalArea */
  usableAreaPercent: number;

  /** Manual category scores */
  categories: Record<ScorecardCategory, CategoryScore>;

  /** Weighted composite score (0-100), null if incomplete */
  compositeScore: number | null;

  /** When scorecard was first created */
  createdAt: string;

  /** When scorecard was last modified */
  updatedAt: string;
}

/** Default weights for composite score calculation */
export const DEFAULT_SCORECARD_WEIGHTS: Record<ScorecardCategory | 'usableArea', number> = {
  usableArea: 0.20,    // 20%
  grid: 0.25,          // 25%
  access: 0.15,        // 15%
  land: 0.20,          // 20%
  environmental: 0.20, // 20%
};

/** Check if all categories have been rated */
export function isScorecardComplete(scorecard: SiteScorecard): boolean {
  const categories: ScorecardCategory[] = ['grid', 'access', 'land', 'environmental'];
  return categories.every((cat) => scorecard.categories[cat].rating !== null);
}

/** Get traffic light color from composite score */
export function getTrafficLightColor(score: number | null): TrafficLightColor | null {
  if (score === null) return null;
  if (score < 40) return 'red';
  if (score < 70) return 'yellow';
  return 'green';
}

/** Calculate composite score from scorecard data */
export function calculateCompositeScore(
  scorecard: SiteScorecard,
  weights = DEFAULT_SCORECARD_WEIGHTS
): number | null {
  const categories: ScorecardCategory[] = ['grid', 'access', 'land', 'environmental'];

  // Check if all categories are rated
  if (!categories.every((cat) => scorecard.categories[cat].rating !== null)) {
    return null;
  }

  // Convert usable area % to 0-100 scale (already is)
  const usableAreaScore = Math.min(100, Math.max(0, scorecard.usableAreaPercent));

  // Convert 1-5 ratings to 0-100 scale
  // Rating 1 = 0, Rating 2 = 25, Rating 3 = 50, Rating 4 = 75, Rating 5 = 100
  const ratingToScore = (rating: ScorecardRating): number => {
    if (rating === null) return 0;
    return (rating - 1) * 25;
  };

  // Calculate weighted average
  let totalScore = usableAreaScore * weights.usableArea;

  for (const cat of categories) {
    const rating = scorecard.categories[cat].rating;
    totalScore += ratingToScore(rating) * weights[cat];
  }

  return Math.round(totalScore);
}

/** Create an empty scorecard with auto-calculated usable area % */
export function createEmptyScorecard(usableAreaPercent: number): SiteScorecard {
  const now = new Date().toISOString();

  return {
    usableAreaPercent,
    categories: {
      grid: { rating: null },
      access: { rating: null },
      land: { rating: null },
      environmental: { rating: null },
    },
    compositeScore: null,
    createdAt: now,
    updatedAt: now,
  };
}
