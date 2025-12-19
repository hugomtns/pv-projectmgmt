import type { User, CustomRole } from '@/lib/types';

/**
 * Get user by ID with null safety
 */
export function getUserById(userId: string | null | undefined, users: User[]): User | null {
  if (!userId) return null;
  return users.find((u) => u.id === userId) ?? null;
}

/**
 * Get full display name ("FirstName LastName" or fallback)
 */
export function getUserDisplayName(
  userId: string | null | undefined,
  users: User[]
): string {
  if (!userId || userId === '') return 'Unassigned';

  const user = getUserById(userId, users);
  if (!user) return 'Former User';

  return `${user.firstName} ${user.lastName}`;
}

/**
 * Get user initials for avatar ("FL" or fallback)
 */
export function getUserInitials(
  userId: string | null | undefined,
  users: User[]
): string {
  if (!userId || userId === '') return '?';

  const user = getUserById(userId, users);
  if (!user) return '?';

  const firstInitial = user.firstName.charAt(0).toUpperCase();
  const lastInitial = user.lastName.charAt(0).toUpperCase();

  return `${firstInitial}${lastInitial}`;
}

/**
 * Get user with role info for tooltips
 */
export function getUserWithRole(
  userId: string | null | undefined,
  users: User[],
  roles: CustomRole[]
): {
  user: User | null;
  role: CustomRole | null;
} {
  const user = getUserById(userId, users);
  if (!user) return { user: null, role: null };

  const role = roles.find((r) => r.id === user.roleId) ?? null;
  return { user, role };
}

/**
 * Avatar color palette (8 colors with good contrast)
 */
const AVATAR_COLORS = [
  'hsl(220, 90%, 56%)',  // Blue
  'hsl(142, 76%, 36%)',  // Green
  'hsl(291, 64%, 42%)',  // Purple
  'hsl(24, 95%, 53%)',   // Orange
  'hsl(199, 89%, 48%)',  // Cyan
  'hsl(346, 87%, 43%)',  // Red/Pink
  'hsl(45, 93%, 47%)',   // Yellow/Gold
  'hsl(262, 83%, 58%)',  // Violet
];

/**
 * Simple string hash function for deterministic color selection
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get deterministic avatar color based on user ID
 * Same user will always get the same color
 */
export function getAvatarColor(userId: string | null | undefined): string {
  if (!userId || userId === '') {
    return 'hsl(220, 13%, 69%)'; // Gray for unassigned
  }

  const hash = hashString(userId);
  const colorIndex = hash % AVATAR_COLORS.length;
  return AVATAR_COLORS[colorIndex];
}

/**
 * Get display state handling edge cases
 */
export function getUserDisplayState(
  userId: string | null | undefined,
  users: User[]
): {
  type: 'user' | 'unassigned' | 'deleted';
  display: string;
  user?: User;
} {
  if (!userId || userId === '') {
    return { type: 'unassigned', display: 'Unassigned' };
  }

  const user = getUserById(userId, users);
  if (!user) {
    return { type: 'deleted', display: 'Former User', user: undefined };
  }

  return {
    type: 'user',
    display: getUserDisplayName(userId, users),
    user,
  };
}
