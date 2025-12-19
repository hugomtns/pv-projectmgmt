import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useUserStore } from '@/stores/userStore';
import {
  getUserInitials,
  getUserWithRole,
  getUserDisplayState,
} from '@/lib/userUtils';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showRole?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function UserAvatar({
  userId,
  size = 'md',
  showTooltip = true,
  showRole = false,
  className,
}: UserAvatarProps) {
  const users = useUserStore((state) => state.users);
  const roles = useUserStore((state) => state.roles);

  const displayState = getUserDisplayState(userId, users);
  const initials = getUserInitials(userId, users);
  const { user, role } = getUserWithRole(userId, users, roles);

  const avatar = (
    <div className="relative inline-block">
      <Avatar
        className={cn(sizeClasses[size], 'bg-muted border border-border', className)}
      >
        <AvatarFallback
          className="bg-muted text-muted-foreground font-semibold"
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {showRole && role && size !== 'xs' && (
        <Badge
          variant={role.name.toLowerCase() === 'admin' ? 'default' : 'secondary'}
          className="absolute -bottom-1 -right-1 h-4 px-1 text-[9px] font-medium"
        >
          {role.name.charAt(0)}
        </Badge>
      )}
    </div>
  );

  if (!showTooltip) {
    return avatar;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-semibold">{displayState.display}</div>
            {user && (
              <>
                <div className="text-xs text-muted-foreground">{user.email}</div>
                {role && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {role.name} • {user.function}
                  </div>
                )}
              </>
            )}
            {displayState.type === 'unassigned' && (
              <div className="text-xs text-muted-foreground">No user assigned</div>
            )}
            {displayState.type === 'deleted' && (
              <div className="text-xs text-muted-foreground">
                User no longer exists
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
