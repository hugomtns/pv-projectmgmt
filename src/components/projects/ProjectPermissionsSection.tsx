import { useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import { getProjectGroupOverrides } from '@/lib/permissions/projectPermissions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Plus, Trash2, Shield } from 'lucide-react';
import type { PermissionAction, PermissionSet } from '@/lib/types/permission';

export interface GroupPermissionEntry {
  groupId: string;
  permissions: Partial<PermissionSet>;
}

interface ProjectPermissionsSectionProps {
  /** Project ID — undefined when creating a new project */
  projectId?: string;
  /** Current permission entries (controlled state) */
  entries: GroupPermissionEntry[];
  /** Whether custom permissions mode is active */
  useCustomPermissions: boolean;
  /** Toggle between default and custom mode */
  onToggleCustom: (custom: boolean) => void;
  /** Called when entries change */
  onEntriesChange: (entries: GroupPermissionEntry[]) => void;
}

const PERMISSION_ACTIONS: Array<{ action: PermissionAction; label: string }> = [
  { action: 'create', label: 'C' },
  { action: 'read', label: 'R' },
  { action: 'update', label: 'U' },
  { action: 'delete', label: 'D' },
];

export function ProjectPermissionsSection({
  entries,
  useCustomPermissions,
  onToggleCustom,
  onEntriesChange,
}: ProjectPermissionsSectionProps) {
  const groups = useUserStore((state) => state.groups);
  const [isOpen, setIsOpen] = useState(useCustomPermissions);

  // Groups already assigned in entries
  const assignedGroupIds = new Set(entries.map((e) => e.groupId));

  // Groups available to add
  const availableGroups = groups.filter((g) => !assignedGroupIds.has(g.id));

  const handleAddGroup = () => {
    if (availableGroups.length === 0) return;
    onEntriesChange([
      ...entries,
      {
        groupId: availableGroups[0].id,
        permissions: { create: false, read: true, update: false, delete: false },
      },
    ]);
  };

  const handleRemoveEntry = (index: number) => {
    onEntriesChange(entries.filter((_, i) => i !== index));
  };

  const handleGroupChange = (index: number, groupId: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], groupId };
    onEntriesChange(updated);
  };

  const handlePermissionChange = (
    index: number,
    action: PermissionAction,
    checked: boolean
  ) => {
    const updated = [...entries];
    updated[index] = {
      ...updated[index],
      permissions: { ...updated[index].permissions, [action]: checked },
    };
    onEntriesChange(updated);
  };

  const getGroupName = (groupId: string) => {
    return groups.find((g) => g.id === groupId)?.name ?? 'Unknown group';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="flex w-full items-center justify-between px-0 hover:bg-transparent"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4" />
            Project Permissions
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Mode toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="permMode"
              checked={!useCustomPermissions}
              onChange={() => onToggleCustom(false)}
              className="accent-primary"
            />
            <span className="text-sm">All users (role defaults)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="permMode"
              checked={useCustomPermissions}
              onChange={() => onToggleCustom(true)}
              className="accent-primary"
            />
            <span className="text-sm">Custom group permissions</span>
          </label>
        </div>

        {useCustomPermissions && (
          <div className="space-y-3">
            {/* Header row */}
            {entries.length > 0 && (
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs text-muted-foreground px-1">
                <span>Group</span>
                <span className="flex gap-3 pr-8">
                  {PERMISSION_ACTIONS.map(({ action, label }) => (
                    <span key={action} className="w-5 text-center">
                      {label}
                    </span>
                  ))}
                </span>
                <span />
              </div>
            )}

            {/* Permission entries */}
            {entries.map((entry, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border p-2"
              >
                <Select
                  value={entry.groupId}
                  onValueChange={(val) => handleGroupChange(index, val)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue>{getGroupName(entry.groupId)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {groups
                      .filter(
                        (g) => g.id === entry.groupId || !assignedGroupIds.has(g.id)
                      )
                      .map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-3">
                  {PERMISSION_ACTIONS.map(({ action, label }) => (
                    <div key={action} className="flex items-center gap-1">
                      <Checkbox
                        id={`perm-${index}-${action}`}
                        checked={entry.permissions[action] ?? false}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(index, action, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`perm-${index}-${action}`}
                        className="text-xs font-normal cursor-pointer sr-only"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemoveEntry(index)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}

            {/* Add group button */}
            {availableGroups.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddGroup}
                className="w-full"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Group
              </Button>
            )}

            {entries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No group permissions configured. Click "Add Group" to restrict
                access to specific groups.
              </p>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Load existing project-specific overrides into GroupPermissionEntry[] format.
 * Use this when opening ProjectDetail to initialize the section state.
 */
export function loadProjectPermissionEntries(
  projectId: string
): { useCustom: boolean; entries: GroupPermissionEntry[] } {
  const overrides = useUserStore.getState().permissionOverrides;
  const projectOverrides = getProjectGroupOverrides(projectId, overrides);

  if (projectOverrides.length === 0) {
    return { useCustom: false, entries: [] };
  }

  return {
    useCustom: true,
    entries: projectOverrides.map((o) => ({
      groupId: o.groupId,
      permissions: { ...o.permissions },
    })),
  };
}
