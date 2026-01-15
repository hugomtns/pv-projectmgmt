import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MilestoneList } from './MilestoneList';
import { MilestoneDialog } from './MilestoneDialog';
import type { Milestone } from '@/lib/types';

interface MilestoneSectionProps {
  projectId: string;
  milestones: Milestone[];
  canUpdate: boolean;
}

export function MilestoneSection({ projectId, milestones, canUpdate }: MilestoneSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const handleAddNew = () => {
    setEditingMilestone(null);
    setDialogOpen(true);
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingMilestone(null);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Milestones
          {milestones.length > 0 && (
            <span className="text-muted-foreground ml-1">({milestones.length})</span>
          )}
        </h3>
        {canUpdate && (
          <Button size="sm" onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-1" />
            Add Milestone
          </Button>
        )}
      </div>

      <MilestoneList
        projectId={projectId}
        milestones={milestones}
        onEdit={handleEdit}
        canUpdate={canUpdate}
      />

      <MilestoneDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        projectId={projectId}
        milestone={editingMilestone}
      />
    </div>
  );
}
