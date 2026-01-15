import { useState } from 'react';
import type { NtpChecklistItem, NtpCategory } from '@/lib/types';
import { NTP_CATEGORY_ORDER } from '@/lib/types';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { NtpChecklistProgress } from './NtpChecklistProgress';
import { NtpChecklistCategory } from './NtpChecklistCategory';
import { NtpChecklistItemDialog } from './NtpChecklistItemDialog';
import { InitializeNtpDialog } from './InitializeNtpDialog';
import { ClipboardList, Plus } from 'lucide-react';

interface NtpChecklistSectionProps {
  projectId: string;
}

export function NtpChecklistSection({ projectId }: NtpChecklistSectionProps) {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  const toggleNtpChecklistItemStatus = useProjectStore((s) => s.toggleNtpChecklistItemStatus);

  const [selectedItem, setSelectedItem] = useState<NtpChecklistItem | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [initDialogOpen, setInitDialogOpen] = useState(false);

  if (!project) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Project not found
      </div>
    );
  }

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
            Initialize an NTP (Notice to Proceed) checklist to track all due diligence
            items required before construction financing and project commencement.
          </p>
        </div>
        <Button onClick={() => setInitDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Initialize NTP Checklist
        </Button>

        <InitializeNtpDialog
          projectId={projectId}
          open={initDialogOpen}
          onOpenChange={setInitDialogOpen}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <NtpChecklistProgress items={ntpChecklist.items} />

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
            />
          );
        })}
      </div>

      {/* Item Detail Dialog */}
      <NtpChecklistItemDialog
        item={selectedItem}
        projectId={projectId}
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
      />
    </div>
  );
}
