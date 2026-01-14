import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BOQEmptyStateProps {
  onCreateBOQ: () => void;
  canCreate: boolean;
}

export function BOQEmptyState({ onCreateBOQ, canCreate }: BOQEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium mb-2">No Bill of Quantities</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Create a BOQ to track quantities and costs of equipment for this design.
        You can auto-generate items from the DXF file.
      </p>
      {canCreate && (
        <Button onClick={onCreateBOQ} className="gap-2">
          <Plus className="h-4 w-4" />
          Create BOQ
        </Button>
      )}
    </div>
  );
}
