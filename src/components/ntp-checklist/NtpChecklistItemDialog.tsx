import { useState, useEffect } from 'react';
import type { NtpChecklistItem, TaskStatus, NtpCategory } from '@/lib/types';
import { NTP_CATEGORY_LABELS } from '@/lib/types';
import { useProjectStore } from '@/stores/projectStore';
import { useDocumentStore } from '@/stores/documentStore';
import { NTP_CATEGORY_TO_MILESTONE_COLOR } from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Trash2,
  ExternalLink,
  CalendarIcon,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NtpChecklistItemDialogProps {
  item: NtpChecklistItem | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canModify?: boolean;
}

export function NtpChecklistItemDialog({
  item,
  projectId,
  open,
  onOpenChange,
  canModify = false,
}: NtpChecklistItemDialogProps) {
  const updateNtpChecklistItem = useProjectStore((s) => s.updateNtpChecklistItem);
  const deleteNtpChecklistItem = useProjectStore((s) => s.deleteNtpChecklistItem);
  const addMilestone = useProjectStore((s) => s.addMilestone);
  const projects = useProjectStore((s) => s.projects);
  const documents = useDocumentStore((s) => s.documents);

  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [notes, setNotes] = useState('');
  const [required, setRequired] = useState(true);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (item) {
      setStatus(item.status);
      setNotes(item.notes || '');
      setRequired(item.required);
      setTargetDate(item.targetDate ? new Date(item.targetDate) : undefined);
    }
  }, [item]);

  if (!item) return null;

  const attachedDocuments = documents.filter((doc) =>
    item.attachmentIds.includes(doc.id)
  );

  const handleSave = () => {
    updateNtpChecklistItem(projectId, item.id, {
      status,
      notes,
      required,
      targetDate: targetDate ? format(targetDate, 'yyyy-MM-dd') : null,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    deleteNtpChecklistItem(projectId, item.id);
    onOpenChange(false);
  };

  const handleCreateMilestone = () => {
    if (!targetDate || !item) return;

    // Check for duplicate
    const project = projects.find((p) => p.id === projectId);
    const hasDuplicate = project?.milestones?.some((m) => m.name === item.title);
    if (hasDuplicate) {
      toast.warning('A milestone with this name already exists');
    }

    addMilestone(projectId, {
      name: item.title,
      description: item.description || `NTP checklist item: ${item.title}`,
      date: format(targetDate, 'yyyy-MM-dd'),
      color: NTP_CATEGORY_TO_MILESTONE_COLOR[item.category] || '#3b82f6',
    });
  };

  const getStatusIcon = (s: TaskStatus) => {
    switch (s) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(item.status)}
            <span className="truncate">{item.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {NTP_CATEGORY_LABELS[item.category as NtpCategory]}
            </Badge>
            {item.required && (
              <Badge variant="secondary">Required</Badge>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          <Separator />

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)} disabled={!canModify}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    Not Started
                  </div>
                </SelectItem>
                <SelectItem value="in_progress">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    In Progress
                  </div>
                </SelectItem>
                <SelectItem value="complete">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Complete
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Completion Info */}
          {item.completedAt && item.completedBy && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              Completed by <strong>{item.completedBy}</strong> on{' '}
              {new Date(item.completedAt).toLocaleDateString()} at{' '}
              {new Date(item.completedAt).toLocaleTimeString()}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this checklist item..."
              rows={3}
              disabled={!canModify}
            />
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label>Target Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !targetDate && 'text-muted-foreground'
                  )}
                  disabled={!canModify}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, 'PPP') : 'No target date set'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={setTargetDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Create Milestone Button */}
          {targetDate && canModify && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateMilestone}
              className="w-full"
            >
              <Flag className="h-4 w-4 mr-2" />
              Create Milestone from This Item
            </Button>
          )}

          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="required">Required for NTP</Label>
              <p className="text-xs text-muted-foreground">
                Mark this item as required for Notice to Proceed
              </p>
            </div>
            <Switch
              id="required"
              checked={required}
              onCheckedChange={setRequired}
              disabled={!canModify}
            />
          </div>

          <Separator />

          {/* Attached Documents */}
          <div className="space-y-2">
            <Label>Attached Documents ({attachedDocuments.length})</Label>
            {attachedDocuments.length > 0 ? (
              <div className="space-y-2">
                {attachedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm truncate">{doc.name}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No documents attached. Upload documents from the Documents tab and link them here.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {canModify && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Item
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {canModify ? 'Cancel' : 'Close'}
          </Button>
          {canModify && <Button onClick={handleSave}>Save Changes</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
