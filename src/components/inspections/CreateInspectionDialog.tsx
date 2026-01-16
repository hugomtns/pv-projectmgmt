import { useState } from 'react';
import { useInspectionStore } from '@/stores/inspectionStore';
import { useUserStore } from '@/stores/userStore';
import { useSiteStore } from '@/stores/siteStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InspectionType } from '@/lib/types';
import { INSPECTION_TYPE_LABELS } from '@/lib/types/inspection';
import { getTemplateItemCounts } from '@/data/inspectionTemplates';

interface CreateInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const INSPECTION_TYPES: InspectionType[] = [
  'pre_construction',
  'progress',
  'commissioning',
  'annual_om',
];

export function CreateInspectionDialog({
  open,
  onOpenChange,
  projectId,
}: CreateInspectionDialogProps) {
  const createInspection = useInspectionStore((state) => state.createInspection);
  const currentUser = useUserStore((state) => state.currentUser);
  const sites = useSiteStore((state) => state.sites);
  const projectSites = sites.filter((s) => s.projectId === projectId);

  const [type, setType] = useState<InspectionType>('progress');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [siteId, setSiteId] = useState<string>('');
  const [inspectorCompany, setInspectorCompany] = useState('');

  const inspectorName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : '';

  const handleSubmit = () => {
    if (!scheduledDate) return;

    const formattedDate = format(scheduledDate, 'yyyy-MM-dd');
    const result = createInspection(
      projectId,
      type,
      formattedDate,
      siteId || undefined,
      inspectorCompany || undefined
    );

    if (result) {
      // Reset form
      setType('progress');
      setScheduledDate(new Date());
      setSiteId('');
      setInspectorCompany('');
      onOpenChange(false);
    }
  };

  const selectedTypeInfo = getTemplateItemCounts(type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Inspection</DialogTitle>
          <DialogDescription>
            Create a new inspection from a template. All checklist items will be
            pre-populated based on the inspection type.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Inspection Type */}
          <div className="grid gap-2">
            <Label htmlFor="type">Inspection Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as InspectionType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {INSPECTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {INSPECTION_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedTypeInfo.total} checklist items ({selectedTypeInfo.required} required,{' '}
              {selectedTypeInfo.optional} optional)
            </p>
          </div>

          {/* Scheduled Date */}
          <div className="grid gap-2">
            <Label>Scheduled Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal',
                    !scheduledDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Site (optional) */}
          {projectSites.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="site">Site (Optional)</Label>
              <Select value={siteId || '__none__'} onValueChange={(v) => setSiteId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific site</SelectItem>
                  {projectSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Inspector Info */}
          <div className="grid gap-2">
            <Label>Inspector</Label>
            <Input value={inspectorName} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              You will be assigned as the inspector
            </p>
          </div>

          {/* Inspector Company */}
          <div className="grid gap-2">
            <Label htmlFor="company">Company (Optional)</Label>
            <Input
              id="company"
              value={inspectorCompany}
              onChange={(e) => setInspectorCompany(e.target.value)}
              placeholder="e.g., ABC Inspections LLC"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!scheduledDate}>
            Create Inspection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
