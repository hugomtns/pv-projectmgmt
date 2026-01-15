import { useState, useEffect } from 'react';
import type { NtpCategory } from '@/lib/types';
import { NTP_CATEGORY_LABELS, NTP_CATEGORY_ORDER } from '@/lib/types';
import { useProjectStore } from '@/stores/projectStore';
import {
  getTemplateItemsByCategory,
  type NtpChecklistItemTemplate,
} from '@/data/ntpChecklistTemplate';
import { format } from 'date-fns';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddNtpItemDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: NtpCategory;
}

export function AddNtpItemDialog({
  projectId,
  open,
  onOpenChange,
  defaultCategory,
}: AddNtpItemDialogProps) {
  const addNtpChecklistItem = useProjectStore((s) => s.addNtpChecklistItem);
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<NtpCategory>(defaultCategory || 'site_control');
  const [required, setRequired] = useState(true);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Reset form when dialog opens/closes or defaultCategory changes
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setCategory(defaultCategory || 'site_control');
      setRequired(true);
      setTargetDate(undefined);
    }
  }, [open, defaultCategory]);

  const templateItemsByCategory = getTemplateItemsByCategory();

  // Get existing item titles to check for duplicates
  const existingTitles = new Set(
    project?.ntpChecklist?.items.map((item) => item.title.toLowerCase()) || []
  );

  const handleSelectTemplate = (template: NtpChecklistItemTemplate) => {
    setTitle(template.title);
    setDescription(template.description);
    setCategory(template.category);
    setRequired(template.required);
    setComboboxOpen(false);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    addNtpChecklistItem(projectId, {
      title: title.trim(),
      description: description.trim(),
      category,
      status: 'not_started',
      required,
      attachmentIds: [],
      notes: '',
      targetDate: targetDate ? format(targetDate, 'yyyy-MM-dd') : null,
      completedAt: null,
      completedBy: null,
    });

    onOpenChange(false);
  };

  const isDuplicate = existingTitles.has(title.toLowerCase().trim());
  const canSubmit = title.trim() && !isDuplicate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add NTP Checklist Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Title with Searchable Combobox */}
          <div className="space-y-2">
            <Label>Item *</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between font-normal"
                >
                  {title || 'Search or enter custom item...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search items..."
                    value={title}
                    onValueChange={setTitle}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="p-2 text-sm text-muted-foreground">
                        No template found. "{title}" will be added as a custom item.
                      </div>
                    </CommandEmpty>
                    {NTP_CATEGORY_ORDER.map((cat) => {
                      const items = templateItemsByCategory[cat];
                      if (items.length === 0) return null;
                      return (
                        <CommandGroup key={cat} heading={NTP_CATEGORY_LABELS[cat]}>
                          {items.map((item) => (
                            <CommandItem
                              key={item.title}
                              value={item.title}
                              onSelect={() => handleSelectTemplate(item)}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  title === item.title ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex-1">
                                <div>{item.title}</div>
                                {item.required && (
                                  <span className="text-xs text-muted-foreground">Required</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {isDuplicate && (
              <p className="text-sm text-destructive">
                An item with this title already exists in this checklist.
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as NtpCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NTP_CATEGORY_ORDER.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {NTP_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this checklist item..."
              rows={2}
            />
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="add-required">Required for NTP</Label>
              <p className="text-xs text-muted-foreground">
                Mark this item as required for Notice to Proceed
              </p>
            </div>
            <Switch
              id="add-required"
              checked={required}
              onCheckedChange={setRequired}
            />
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label>Target Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !targetDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, 'PPP') : 'Select date...'}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
