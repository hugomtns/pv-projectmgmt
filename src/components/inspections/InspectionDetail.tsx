import { useState, useMemo } from 'react';
import { useInspectionStore } from '@/stores/inspectionStore';
import { useSiteStore } from '@/stores/siteStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { InspectionProgress } from './InspectionProgress';
import { InspectionCategory } from './InspectionCategory';
import { InspectionItemDialog } from './InspectionItemDialog';
import { SignaturePanel } from './SignaturePanel';
import { format } from 'date-fns';
import { Calendar, MapPin, User, Building2, Play, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  INSPECTION_TYPE_LABELS,
  INSPECTION_STATUS_LABELS,
  INSPECTION_CATEGORY_ORDER,
  type InspectionCategory as InspectionCategoryType,
  type InspectionItem,
  type InspectionItemResult,
} from '@/lib/types/inspection';
import type { Inspection } from '@/lib/types/inspection';

interface InspectionDetailProps {
  inspection: Inspection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InspectionDetail({
  inspection,
  open,
  onOpenChange,
}: InspectionDetailProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const updateInspection = useInspectionStore((state) => state.updateInspection);
  const updateInspectionItem = useInspectionStore((state) => state.updateInspectionItem);

  const sites = useSiteStore((state) => state.sites);
  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  const site = inspection?.siteId
    ? sites.find((s) => s.id === inspection.siteId)
    : null;

  // Permission check
  const canEdit = currentUser
    ? resolvePermissions(currentUser, 'inspections', inspection?.id, permissionOverrides, roles).update
    : false;

  // Group items by category
  const itemsByCategory = useMemo(() => {
    if (!inspection) return {};
    const grouped: Record<string, InspectionItem[]> = {};
    for (const category of INSPECTION_CATEGORY_ORDER) {
      const categoryItems = inspection.items.filter((i) => i.category === category);
      if (categoryItems.length > 0) {
        grouped[category] = categoryItems;
      }
    }
    return grouped;
  }, [inspection]);

  if (!inspection) return null;

  const handleItemResultChange = (itemId: string, result: InspectionItemResult) => {
    updateInspectionItem(inspection.id, itemId, { result });
  };

  const handleNotesChange = (notes: string) => {
    updateInspection(inspection.id, { overallNotes: notes });
  };

  const handleStartInspection = () => {
    updateInspection(inspection.id, { status: 'in_progress' });
  };

  const handleCancelInspection = () => {
    updateInspection(inspection.id, { status: 'cancelled' });
  };

  const isEditable = canEdit && inspection.status !== 'completed' && inspection.status !== 'cancelled';

  // Get selected item for dialog
  const selectedItem = selectedItemId
    ? inspection.items.find((i) => i.id === selectedItemId) || null
    : null;

  const handleItemClick = (item: InspectionItem) => {
    setSelectedItemId(item.id);
  };

  const statusVariant = {
    scheduled: 'secondary',
    in_progress: 'default',
    completed: 'default',
    cancelled: 'outline',
  }[inspection.status] as 'secondary' | 'default' | 'outline';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div>
            <SheetTitle className="text-xl pr-8">
              {INSPECTION_TYPE_LABELS[inspection.type]}
            </SheetTitle>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">
                {inspection.items.length} checklist items
              </p>
              <Badge
                variant={statusVariant}
                className={
                  inspection.status === 'completed'
                    ? 'bg-green-500'
                    : inspection.status === 'in_progress'
                    ? 'bg-blue-500'
                    : ''
                }
              >
                {INSPECTION_STATUS_LABELS[inspection.status]}
              </Badge>
            </div>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(inspection.scheduledDate), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{inspection.inspectorName}</span>
            </div>
            {site && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{site.name}</span>
              </div>
            )}
            {inspection.inspectorCompany && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{inspection.inspectorCompany}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {canEdit && inspection.status === 'scheduled' && (
            <div className="flex gap-2">
              <Button onClick={handleStartInspection} className="gap-2">
                <Play className="w-4 h-4" />
                Start Inspection
              </Button>
              <Button variant="outline" onClick={handleCancelInspection} className="gap-2">
                <XCircle className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          )}

          {/* Progress bar */}
          <InspectionProgress items={inspection.items} />
        </SheetHeader>

        {/* Checklist by category */}
        <div className="mt-6 space-y-4">
          {INSPECTION_CATEGORY_ORDER.map((category: InspectionCategoryType) => {
            const items = itemsByCategory[category];
            if (!items || items.length === 0) return null;

            return (
              <InspectionCategory
                key={category}
                category={category}
                items={items}
                onItemResultChange={handleItemResultChange}
                onItemClick={handleItemClick}
                disabled={!isEditable}
              />
            );
          })}
        </div>

        {/* Overall notes */}
        <div className="mt-6 space-y-2">
          <Label>Overall Notes</Label>
          <Textarea
            value={inspection.overallNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add any overall notes about this inspection..."
            rows={4}
            disabled={!isEditable}
          />
        </div>

        {/* Signatures section */}
        {(inspection.status === 'in_progress' || inspection.status === 'completed') && (
          <div className="mt-6 pt-6 border-t">
            <SignaturePanel
              inspection={inspection}
              disabled={!isEditable}
            />
          </div>
        )}

        {/* Completion section */}
        {inspection.status === 'in_progress' && canEdit && (
          <CompletionSection inspection={inspection} />
        )}

        {/* Item detail dialog */}
        <InspectionItemDialog
          inspectionId={inspection.id}
          item={selectedItem}
          open={!!selectedItemId}
          onOpenChange={(open) => !open && setSelectedItemId(null)}
          disabled={!isEditable}
        />
      </SheetContent>
    </Sheet>
  );
}

// Completion section component
function CompletionSection({ inspection }: { inspection: Inspection }) {
  const updateInspection = useInspectionStore((state) => state.updateInspection);

  // Calculate completion requirements
  const requiredItems = inspection.items.filter((i) => i.required);
  const incompleteRequired = requiredItems.filter((i) => i.result === 'pending');
  const hasSignature = inspection.signatures.length > 0;
  const openPunchListItems = inspection.items.filter(
    (i) => i.isPunchListItem && !i.punchListResolvedAt
  );

  const canComplete = incompleteRequired.length === 0 && hasSignature;

  const handleComplete = () => {
    updateInspection(inspection.id, {
      status: 'completed',
      completedDate: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="mt-6 pt-6 border-t space-y-4">
      <Label>Complete Inspection</Label>

      {/* Requirements checklist */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          {incompleteRequired.length === 0 ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          )}
          <span className={incompleteRequired.length === 0 ? 'text-green-600' : 'text-orange-600'}>
            {incompleteRequired.length === 0
              ? 'All required items completed'
              : `${incompleteRequired.length} required item${incompleteRequired.length !== 1 ? 's' : ''} pending`}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {hasSignature ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          )}
          <span className={hasSignature ? 'text-green-600' : 'text-orange-600'}>
            {hasSignature
              ? `${inspection.signatures.length} signature${inspection.signatures.length !== 1 ? 's' : ''} added`
              : 'At least one signature required'}
          </span>
        </div>

        {openPunchListItems.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-600">
              {openPunchListItems.length} open punch list item{openPunchListItems.length !== 1 ? 's' : ''} (optional to resolve)
            </span>
          </div>
        )}
      </div>

      <Button
        className="w-full gap-2"
        onClick={handleComplete}
        disabled={!canComplete}
      >
        <CheckCircle className="w-4 h-4" />
        Mark Inspection Complete
      </Button>

      {!canComplete && (
        <p className="text-xs text-muted-foreground text-center">
          Complete all required items and add at least one signature to finalize.
        </p>
      )}
    </div>
  );
}
