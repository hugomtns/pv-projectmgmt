import { formatDistanceToNow, format, isPast, parseISO } from 'date-fns';
import type { Milestone } from './types';

/**
 * Get the next upcoming milestone from an array of milestones
 * Returns the earliest incomplete milestone, or null if none exist
 */
export function getNextMilestone(milestones: Milestone[]): Milestone | null {
  if (!milestones || milestones.length === 0) return null;

  const incompleteMilestones = milestones.filter(m => !m.completed);
  if (incompleteMilestones.length === 0) return null;

  // Sort by date (earliest first) and return the first one
  const sorted = incompleteMilestones.sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sorted[0];
}

/**
 * Format a milestone date for display
 * - Relative format if within 30 days (e.g., "in 3 days", "yesterday")
 * - Absolute format otherwise (e.g., "May 15, 2026")
 */
export function formatMilestoneDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const daysDiff = Math.abs(Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Use relative format if within 30 days
    if (daysDiff <= 30) {
      if (isPast(date)) {
        return formatDistanceToNow(date, { addSuffix: true });
      } else {
        return 'in ' + formatDistanceToNow(date);
      }
    }

    // Otherwise use absolute format
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting milestone date:', error);
    return dateString;
  }
}

/**
 * Sort milestones by date (earliest first)
 */
export function sortMilestonesByDate(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Check if a milestone is overdue (past date and not completed)
 */
export function isMilestoneOverdue(milestone: Milestone): boolean {
  if (milestone.completed) return false;
  return isPast(parseISO(milestone.date));
}

/**
 * Get milestones grouped by completion status
 */
export function groupMilestonesByStatus(milestones: Milestone[]) {
  return {
    incomplete: milestones.filter(m => !m.completed),
    completed: milestones.filter(m => m.completed),
  };
}
