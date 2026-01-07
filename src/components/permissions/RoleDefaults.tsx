import { Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserStore } from '@/stores/userStore';
import type { EntityType, PermissionSet } from '@/lib/types/permission';

interface EntityHierarchy {
  type: EntityType;
  label: string;
  level: number;
}

const entityHierarchy: EntityHierarchy[] = [
  { type: 'projects', label: 'Projects', level: 0 },
  { type: 'workflows', label: 'Workflows', level: 1 },
  { type: 'tasks', label: 'Tasks', level: 2 },
  { type: 'comments', label: 'Comments', level: 2 },
  { type: 'documents', label: 'Files', level: 1 },
  { type: 'user_management', label: 'User Management', level: 0 },
];

function PermissionIcon({ granted }: { granted: boolean }) {
  if (granted) {
    return <Check size={16} strokeWidth={2} className="text-green-600 flex-shrink-0" />;
  }
  return <X size={16} strokeWidth={2} className="text-muted-foreground opacity-50 flex-shrink-0" />;
}

function PermissionCell({ permissions }: { permissions: PermissionSet }) {
  return (
    <div className="flex justify-center gap-3">
      <span className="flex items-center gap-1 text-sm font-medium">
        <PermissionIcon granted={permissions.create} />
        C
      </span>
      <span className="flex items-center gap-1 text-sm font-medium">
        <PermissionIcon granted={permissions.read} />
        R
      </span>
      <span className="flex items-center gap-1 text-sm font-medium">
        <PermissionIcon granted={permissions.update} />
        U
      </span>
      <span className="flex items-center gap-1 text-sm font-medium">
        <PermissionIcon granted={permissions.delete} />
        D
      </span>
    </div>
  );
}

export function RoleDefaults() {
  const roles = useUserStore(state => state.roles);

  const getPermissionsForRole = (roleId: string, entityType: EntityType): PermissionSet => {
    const role = roles.find(r => r.id === roleId);
    if (!role) {
      return { create: false, read: false, update: false, delete: false };
    }
    return role.permissions[entityType] ?? { create: false, read: false, update: false, delete: false };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Default Role Permissions</CardTitle>
        <CardDescription>
          Baseline CRUD permissions for each role across all entity types. System roles define the foundation of access control.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border border-border rounded-md mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">Entity Type</TableHead>
                {roles.map((role) => (
                  <TableHead key={role.id} className="text-center min-w-[150px]">
                    {role.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entityHierarchy.map((entity) => (
                <TableRow key={entity.type}>
                  <TableCell
                    className="font-medium"
                    style={{ paddingLeft: `calc(1rem + ${entity.level * 24}px)` }}
                  >
                    <span
                      className={
                        entity.level > 0
                          ? 'text-muted-foreground font-normal text-sm before:content-["└_"] before:text-border before:mr-2'
                          : ''
                      }
                    >
                      {entity.label}
                    </span>
                  </TableCell>
                  {roles.map((role) => (
                    <TableCell key={role.id}>
                      <PermissionCell permissions={getPermissionsForRole(role.id, entity.type)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 bg-muted rounded-md">
          <h4 className="text-sm font-semibold text-foreground mb-3">Legend</h4>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check size={16} strokeWidth={2} className="text-green-600 flex-shrink-0" />
              Granted
            </div>
            <div className="flex items-center gap-2">
              <X size={16} strokeWidth={2} className="text-muted-foreground opacity-50 flex-shrink-0" />
              Denied
            </div>
            <div className="flex items-center gap-2">
              <strong>C</strong> Create • <strong>R</strong> Read • <strong>U</strong> Update • <strong>D</strong> Delete
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
