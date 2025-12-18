import { User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserStore } from '@/stores/userStore';

export function UserSelector() {
  const currentUser = useUserStore(state => state.currentUser);
  const users = useUserStore(state => state.users);
  const roles = useUserStore(state => state.roles);
  const setCurrentUser = useUserStore(state => state.setCurrentUser);

  const handleUserChange = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const getCurrentUserRole = () => {
    if (!currentUser) return '';
    const role = roles.find(r => r.id === currentUser.roleId);
    return role?.name || '';
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-muted-foreground" />
      <Select value={currentUser.id} onValueChange={handleUserChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {currentUser.firstName} {currentUser.lastName}
              </span>
              <span className="text-xs text-muted-foreground">
                {getCurrentUserRole()}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => {
            const role = roles.find(r => r.id === user.roleId);
            return (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {role?.name || 'Unknown'} • {user.email}
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
