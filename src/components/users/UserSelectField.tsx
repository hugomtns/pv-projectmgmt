import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { useUserStore } from '@/stores/userStore';
import { UserAvatar } from './UserAvatar';

interface UserSelectFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function UserSelectField({ value, onValueChange, placeholder = "Select user", className }: UserSelectFieldProps) {
  const users = useUserStore(state => state.users);
  const roles = useUserStore(state => state.roles);

  // Get selected user for custom trigger display
  const selectedUser = users.find(u => u.id === value);
  const selectedRole = selectedUser ? roles.find(r => r.id === selectedUser.roleId) : null;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        {selectedUser ? (
          <div className="flex items-center gap-2 w-full">
            <UserAvatar userId={selectedUser.id} size="sm" showTooltip={false} />
            <span className="font-medium truncate">
              {selectedUser.firstName} {selectedUser.lastName}
            </span>
            {selectedRole && (
              <span className="text-xs text-muted-foreground shrink-0">
                {selectedRole.name}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => {
          const role = roles.find(r => r.id === user.roleId);
          return (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex items-center gap-3 py-1">
                <UserAvatar userId={user.id} size="sm" showTooltip={false} />
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium truncate">
                    {user.firstName} {user.lastName}
                  </span>
                  {role && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {role.name}
                    </span>
                  )}
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
