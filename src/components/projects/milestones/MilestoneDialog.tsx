import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ColorPicker } from './ColorPicker';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MILESTONE_COLORS } from '@/lib/constants';
import type { Milestone } from '@/lib/types';

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone?: Milestone | null;
}

export function MilestoneDialog({ open, onOpenChange, projectId, milestone }: MilestoneDialogProps) {
  const addMilestone = useProjectStore((state) => state.addMilestone);
  const updateMilestone = useProjectStore((state) => state.updateMilestone);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [color, setColor] = useState<string>(MILESTONE_COLORS[0].value);
  const [completed, setCompleted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form when editing
  useEffect(() => {
    if (milestone) {
      setName(milestone.name);
      setDescription(milestone.description);
      setDate(new Date(milestone.date));
      setColor(milestone.color);
      setCompleted(milestone.completed);
    } else {
      // Reset for new milestone
      setName('');
      setDescription('');
      setDate(undefined);
      setColor(MILESTONE_COLORS[0].value);
      setCompleted(false);
    }
    setErrors({});
  }, [milestone, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Format date as YYYY-MM-DD
    const formattedDate = format(date!, 'yyyy-MM-dd');

    if (milestone) {
      // Update existing milestone
      const updates: any = {
        name: name.trim(),
        description: description.trim(),
        date: formattedDate,
        color,
        completed,
      };

      // Set completedAt timestamp when marking as complete
      if (completed && !milestone.completed) {
        updates.completedAt = new Date().toISOString();
      } else if (!completed && milestone.completed) {
        // Clear completedAt when marking as incomplete
        updates.completedAt = null;
      }

      updateMilestone(projectId, milestone.id, updates);
    } else {
      // Add new milestone
      addMilestone(projectId, {
        name: name.trim(),
        description: description.trim(),
        date: formattedDate,
        color,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{milestone ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Design Review Complete"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>
              Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground',
                    errors.date && 'border-destructive'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
            {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional: Add details about this milestone"
              rows={3}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Completion Status (only when editing) */}
          {milestone && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="completed"
                checked={completed}
                onCheckedChange={(checked) => setCompleted(checked as boolean)}
              />
              <Label
                htmlFor="completed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Mark as completed
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{milestone ? 'Update' : 'Add'} Milestone</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
