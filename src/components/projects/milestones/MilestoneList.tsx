import { MilestoneItem } from './MilestoneItem';
import { sortMilestonesByDate } from '@/lib/milestoneUtils';
import type { Milestone } from '@/lib/types';

interface MilestoneListProps {
  projectId: string;
  milestones: Milestone[];
  onEdit: (milestone: Milestone) => void;
  canUpdate: boolean;
}

export function MilestoneList({ projectId, milestones, onEdit, canUpdate }: MilestoneListProps) {
  if (milestones.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No milestones yet. Add your first milestone to track project deadlines.
      </div>
    );
  }

  const sortedMilestones = sortMilestonesByDate(milestones);

  return (
    <div className="space-y-2">
      {sortedMilestones.map((milestone) => (
        <MilestoneItem
          key={milestone.id}
          projectId={projectId}
          milestone={milestone}
          onEdit={onEdit}
          canUpdate={canUpdate}
        />
      ))}
    </div>
  );
}
