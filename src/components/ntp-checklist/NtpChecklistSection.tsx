import { useState } from 'react';
import type { NtpChecklistItem, NtpCategory } from '@/lib/types';
import { NTP_CATEGORY_ORDER } from '@/lib/types';
import { useProjectStore } from '@/stores/projectStore';
import { useUserStore } from '@/stores/userStore';
import { NTP_CATEGORY_TO_MILESTONE_COLOR } from '@/lib/constants';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { NtpChecklistProgress } from './NtpChecklistProgress';
import { NtpChecklistCategory } from './NtpChecklistCategory';
import { NtpChecklistItemDialog } from './NtpChecklistItemDialog';
import { InitializeNtpDialog } from './InitializeNtpDialog';
import { AddNtpItemDialog } from './AddNtpItemDialog';
import { ClipboardList, Plus, Flag } from 'lucide-react';

interface NtpChecklistSectionProps {
  projectId: string;
}

export function NtpChecklistSection({ projectId }: NtpChecklistSectionProps) {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  const toggleNtpChecklistItemStatus = useProjectStore((s) => s.toggleNtpChecklistItemStatus);
  const addMilestone = useProjectStore((s) => s.addMilestone);
  const currentUser = useUserStore((s) => s.currentUser);

  const [selectedItem, setSelectedItem] = useState<NtpChecklistItem | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogCategory, setAddDialogCategory] = useState<NtpCategory | undefined>(undefined);

  if (!project) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Project not found
      </div>
    );
  }

  // Permission check: Admins and project owners can modify, others can only view
  const isAdmin = currentUser?.roleId === 'role-admin';
  const isProjectOwner = currentUser ? project.owner === currentUser.id : false;
  const canModify = isAdmin || isProjectOwner;

  const ntpChecklist = project.ntpChecklist;

  // Group items by category
  const itemsByCategory = NTP_CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = ntpChecklist?.items.filter((item) => item.category === category) || [];
    return acc;
  }, {} as Record<NtpCategory, NtpChecklistItem[]>);

  const handleToggleStatus = (itemId: string) => {
    toggleNtpChecklistItemStatus(projectId, itemId);
  };

  const handleItemClick = (item: NtpChecklistItem) => {
    setSelectedItem(item);
    setItemDialogOpen(true);
  };

  const handleAddItem = (category?: NtpCategory) => {
    setAddDialogCategory(category);
    setAddDialogOpen(true);
  };

  // Items with target dates (for bulk milestone creation)
  const itemsWithDates = ntpChecklist?.items.filter((item) => item.targetDate) || [];

  const handleCreateAllMilestones = () => {
    if (itemsWithDates.length === 0) return;

    const existingNames = new Set(project.milestones?.map((m) => m.name) || []);
    let created = 0;
    let skipped = 0;

    for (const item of itemsWithDates) {
      if (existingNames.has(item.title)) {
        skipped++;
        continue;
      }

      addMilestone(projectId, {
        name: item.title,
        description: item.description || `NTP checklist item: ${item.title}`,
        date: item.targetDate!,
        color: NTP_CATEGORY_TO_MILESTONE_COLOR[item.category] || '#3b82f6',
      });
      created++;
    }

    if (created > 0) {
      toast.success(`Created ${created} milestone${created > 1 ? 's' : ''}`);
    }
    if (skipped > 0) {
      toast.info(`Skipped ${skipped} item${skipped > 1 ? 's' : ''} (milestones already exist)`);
    }
    if (created === 0 && skipped === 0) {
      toast.info('No milestones to create');
    }
  };

  // Show initialize prompt if no checklist exists
  if (!ntpChecklist) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">No NTP Checklist</h3>
          <p className="text-muted-foreground max-w-md">
            {canModify
              ? 'Initialize an NTP (Notice to Proceed) checklist to track all due diligence items required before construction financing and project commencement.'
              : 'No NTP checklist has been initialized for this project yet. Only the project owner or an admin can initialize it.'}
          </p>
        </div>
        {canModify && (
          <>
            <Button onClick={() => setInitDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Initialize NTP Checklist
            </Button>

            <InitializeNtpDialog
              projectId={projectId}
              open={initDialogOpen}
              onOpenChange={setInitDialogOpen}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="space-y-3">
        <NtpChecklistProgress items={ntpChecklist.items} />
        {canModify && itemsWithDates.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleCreateAllMilestones} className="w-full sm:w-auto">
            <Flag className="h-4 w-4 mr-2" />
            Add All as Milestones ({itemsWithDates.length})
          </Button>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-2 border rounded-lg">
        {NTP_CATEGORY_ORDER.map((category) => {
          const items = itemsByCategory[category];
          if (items.length === 0) return null;

          return (
            <NtpChecklistCategory
              key={category}
              category={category}
              items={items}
              onToggleStatus={handleToggleStatus}
              onItemClick={handleItemClick}
              onAddItem={() => handleAddItem(category)}
              canModify={canModify}
            />
          );
        })}
      </div>

      {/* Add Item Button */}
      {canModify && (
        <Button variant="outline" onClick={() => handleAddItem()} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      )}

      {/* Item Detail Dialog */}
      <NtpChecklistItemDialog
        item={selectedItem}
        projectId={projectId}
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        canModify={canModify}
      />

      {/* Add Item Dialog */}
      <AddNtpItemDialog
        projectId={projectId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        defaultCategory={addDialogCategory}
      />
    </div>
  );
}
