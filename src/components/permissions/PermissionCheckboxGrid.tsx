import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { PermissionSet, PermissionAction } from '@/lib/types/permission';

interface PermissionCheckboxGridProps {
  permissions: Partial<PermissionSet>;
  onChange: (action: PermissionAction, checked: boolean) => void;
}

export function PermissionCheckboxGrid({ permissions, onChange }: PermissionCheckboxGridProps) {
  const permissionActions: Array<{ action: PermissionAction; label: string }> = [
    { action: 'create', label: 'Create' },
    { action: 'read', label: 'Read' },
    { action: 'update', label: 'Update' },
    { action: 'delete', label: 'Delete' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {permissionActions.map(({ action, label }) => (
        <div key={action} className="flex items-center space-x-2">
          <Checkbox
            id={`permission-${action}`}
            checked={permissions[action] ?? false}
            onCheckedChange={(checked) => onChange(action, checked as boolean)}
          />
          <Label
            htmlFor={`permission-${action}`}
            className="text-sm font-normal cursor-pointer"
          >
            {label}
          </Label>
        </div>
      ))}
    </div>
  );
}
