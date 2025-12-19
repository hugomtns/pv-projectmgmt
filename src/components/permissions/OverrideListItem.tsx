import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GroupPermissionOverride } from '@/lib/types/permission';
import { getEntityTypeLabel, getEntityNames } from '@/lib/permissions/entityHelpers';

interface OverrideListItemProps {
  override: GroupPermissionOverride;
  onDelete: () => void;
}

export function OverrideListItem({ override, onDelete }: OverrideListItemProps) {
  const entityTypeLabel = getEntityTypeLabel(override.entityType);

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete this permission override for ${entityTypeLabel}?`)) {
      onDelete();
    }
  };

  // Get granted permissions
  const grantedPermissions: Array<{ action: string; label: string }> = [];
  if (override.permissions.create) grantedPermissions.push({ action: 'create', label: 'C' });
  if (override.permissions.read) grantedPermissions.push({ action: 'read', label: 'R' });
  if (override.permissions.update) grantedPermissions.push({ action: 'update', label: 'U' });
  if (override.permissions.delete) grantedPermissions.push({ action: 'delete', label: 'D' });

  // Resolve entity names for specific scope
  const entityNames = override.scope === 'specific'
    ? getEntityNames(override.entityType, override.specificEntityIds)
    : [];

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium">{entityTypeLabel}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Scope */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {override.scope === 'all' ? `All ${entityTypeLabel}` : 'Specific'}
          </Badge>
        </div>

        {override.scope === 'specific' && entityNames.length > 0 && (
          <p className="text-sm text-muted-foreground pl-1">
            {entityNames.join(', ')}
          </p>
        )}

        {override.scope === 'specific' && entityNames.length === 0 && (
          <p className="text-sm text-muted-foreground pl-1 italic">
            No entities selected or entities no longer exist
          </p>
        )}
      </div>

      {/* Permissions */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Permissions:</p>
        <div className="flex gap-1.5">
          {grantedPermissions.map(({ action, label }) => (
            <Badge
              key={action}
              variant="outline"
              className="text-xs px-2 py-0.5 flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              {label}
            </Badge>
          ))}

          {grantedPermissions.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No permissions granted</p>
          )}
        </div>
      </div>
    </div>
  );
}
