import { Check, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PermissionSet } from '@/lib/types/permission';

interface PermissionMatrixProps {
  entityTypes: { key: string; label: string; level?: number }[];
  permissionData: Record<string, PermissionSet>;
  editable?: boolean;
  onChange?: (entityKey: string, action: keyof PermissionSet, value: boolean) => void;
}

function PermissionIcon({ granted }: { granted: boolean }) {
  if (granted) {
    return <Check size={16} strokeWidth={2} className="text-green-600 flex-shrink-0" />;
  }
  return <X size={16} strokeWidth={2} className="text-muted-foreground opacity-50 flex-shrink-0" />;
}

export function PermissionMatrix({ entityTypes, permissionData, editable = false, onChange }: PermissionMatrixProps) {
  const handleCheckboxChange = (entityKey: string, action: keyof PermissionSet, checked: boolean) => {
    onChange?.(entityKey, action, checked);
  };

  const renderPermissionCell = (entityKey: string, action: keyof PermissionSet) => {
    const permissions = permissionData[entityKey];
    const granted = permissions?.[action] ?? false;

    if (editable) {
      return (
        <div className="flex justify-center items-center">
          <Checkbox
            checked={granted}
            onCheckedChange={(checked) => handleCheckboxChange(entityKey, action, checked as boolean)}
          />
        </div>
      );
    }

    return (
      <div className="flex justify-center items-center">
        <PermissionIcon granted={granted} />
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Entity</TableHead>
              <TableHead className="text-center min-w-[100px]">Create</TableHead>
              <TableHead className="text-center min-w-[100px]">Read</TableHead>
              <TableHead className="text-center min-w-[100px]">Update</TableHead>
              <TableHead className="text-center min-w-[100px]">Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entityTypes.map((entity) => (
              <TableRow key={entity.key}>
                <TableCell
                  className="font-medium"
                  style={{
                    paddingLeft: entity.level ? `calc(1rem + ${entity.level * 24}px)` : undefined
                  }}
                >
                  <span className={entity.level ? 'text-muted-foreground font-normal text-sm before:content-["└_"] before:text-border before:mr-2' : ''}>
                    {entity.label}
                  </span>
                </TableCell>
                <TableCell>{renderPermissionCell(entity.key, 'create')}</TableCell>
                <TableCell>{renderPermissionCell(entity.key, 'read')}</TableCell>
                <TableCell>{renderPermissionCell(entity.key, 'update')}</TableCell>
                <TableCell>{renderPermissionCell(entity.key, 'delete')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
