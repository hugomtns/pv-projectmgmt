import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useFilterStore } from '@/stores/filterStore';
import { useDisplayStore } from '@/stores/displayStore';
import { TimelineHeader } from './TimelineHeader';
import { TimelineLegend } from './TimelineLegend';
import { TimelineGrid } from './TimelineGrid';
import { MilestoneDialog } from '../milestones/MilestoneDialog';
import { differenceInDays } from 'date-fns';
import type { Milestone } from '@/lib/types';

export function ProjectTimeline() {
  const projects = useProjectStore((state) => state.projects);
  const filters = useFilterStore((state) => state.filters);
  const { settings } = useDisplayStore();

  // Milestone edit dialog state
  const [editingMilestone, setEditingMilestone] = useState<{ projectId: string; milestone: Milestone } | null>(null);

  // Calculate initial date range based on view mode
  const getInitialDateRange = (): [Date, Date] => {
    const today = new Date();
    const viewMode = settings.timeline.viewMode;

    if (viewMode === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return [start, end];
    } else if (viewMode === 'quarter') {
      const quarterStart = Math.floor(today.getMonth() / 3) * 3;
      const start = new Date(today.getFullYear(), quarterStart, 1);
      const end = new Date(today.getFullYear(), quarterStart + 3, 0);
      return [start, end];
    } else {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return [start, end];
    }
  };

  const [dateRange, setDateRange] = useState<[Date, Date]>(getInitialDateRange());

  // Update date range when view mode changes
  useEffect(() => {
    setDateRange(getInitialDateRange());
  }, [settings.timeline.viewMode]);

  const [rangeStart, rangeEnd] = dateRange;

  // Apply filters (same as list/board views)
  const filteredProjects = projects.filter((project) => {
    if (filters.stages.length > 0 && !filters.stages.includes(project.currentStageId)) {
      return false;
    }
    if (filters.priorities.length > 0 && !filters.priorities.includes(project.priority)) {
      return false;
    }
    if (filters.owners.length > 0 && !filters.owners.includes(project.owner)) {
      return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        project.name.toLowerCase().includes(searchLower) ||
        project.location.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const handleRangeChange = (start: Date, end: Date) => {
    setDateRange([start, end]);
  };

  const handleMilestoneClick = (projectId: string, milestone: Milestone) => {
    setEditingMilestone({ projectId, milestone });
  };

  const handleMilestoneDialogClose = (open: boolean) => {
    if (!open) {
      setEditingMilestone(null);
    }
  };

  // Empty state
  if (filteredProjects.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-3 md:p-6">
        <div className="rounded-lg border border-border bg-card p-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-3">
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">No projects found</p>
              <p className="text-sm text-muted-foreground">
                Adjust your filters to see projects on the timeline
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate today indicator position
  const today = new Date();
  const totalDays = differenceInDays(rangeEnd, rangeStart);
  const todayPosition = differenceInDays(today, rangeStart) / totalDays * 100;
  const isTodayVisible = todayPosition >= 0 && todayPosition <= 100;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="rounded-lg border border-border bg-card m-3 md:m-6 flex-1 flex flex-col overflow-hidden">
        <TimelineHeader
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          viewMode={settings.timeline.viewMode}
          onRangeChange={handleRangeChange}
          onViewModeChange={() => {}}
        />

        <div className="grid grid-cols-[300px_1fr] relative">
          <div className="border-r border-b bg-muted/50 p-3 font-medium text-sm">
            Project
          </div>
          <div className="border-b relative">
            <TimelineLegend
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              viewMode={settings.timeline.viewMode}
            />
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <TimelineGrid
            projects={filteredProjects}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            showCompletedMilestones={settings.timeline.showCompletedMilestones}
            groupBy={settings.timeline.groupBy}
            ordering={settings.timeline.ordering}
            onMilestoneClick={handleMilestoneClick}
          />

          {/* Full-height Today indicator */}
          {isTodayVisible && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              style={{ left: `calc(300px + (100% - 300px) * ${todayPosition / 100})` }}
            />
          )}
        </div>
      </div>

      {/* Milestone Edit Dialog */}
      {editingMilestone && (
        <MilestoneDialog
          open={!!editingMilestone}
          onOpenChange={handleMilestoneDialogClose}
          projectId={editingMilestone.projectId}
          milestone={editingMilestone.milestone}
        />
      )}
    </div>
  );
}
