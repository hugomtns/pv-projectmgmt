import { UserAvatar } from './UserAvatar';
import { Badge } from '@/components/ui/badge';
import { useUserStore } from '@/stores/userStore';
import { getUserDisplayName, getUserWithRole } from '@/lib/userUtils';
import { cn } from '@/lib/utils';

interface UserDisplayProps {
  userId: string | null | undefined;
  variant?: 'full' | 'compact' | 'avatar-only' | 'name-only';
  showAvatar?: boolean;
  showRole?: boolean;
  className?: string;
}

export function UserDisplay({
  userId,
  variant = 'compact',
  showAvatar = true,
  showRole = false,
  className,
}: UserDisplayProps) {
  const users = useUserStore((state) => state.users);
  const roles = useUserStore((state) => state.roles);

  const displayName = getUserDisplayName(userId, users);
  const { user, role } = getUserWithRole(userId, users, roles);

  // Avatar-only variant
  if (variant === 'avatar-only') {
    return <UserAvatar userId={userId} showTooltip showRole={showRole} className={className} />;
  }

  // Name-only variant
  if (variant === 'name-only') {
    return <span className={cn('text-sm', className)}>{displayName}</span>;
  }

  // Compact variant (avatar + name)
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {showAvatar && <UserAvatar userId={userId} size="sm" showTooltip={false} />}
        <span className="text-sm font-medium truncate">{displayName}</span>
        {showRole && role && (
          <Badge variant={role.name.toLowerCase() === 'admin' ? 'default' : 'secondary'} className="ml-1">
            {role.name}
          </Badge>
        )}
      </div>
    );
  }

  // Full variant (avatar + name + email + role)
  if (variant === 'full') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {showAvatar && <UserAvatar userId={userId} size="md" showTooltip={false} />}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{displayName}</span>
          {user && (
            <>
              <span className="text-xs text-muted-foreground">{user.email}</span>
              {role && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={role.name.toLowerCase() === 'admin' ? 'default' : 'secondary'}>
                    {role.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{user.function}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
