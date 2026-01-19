/**
 * Mention Parser Utilities
 *
 * Handles parsing @mentions from text and generating mention-related names.
 * Mentions use the format @firstname.lastname (e.g., @john.smith)
 */

import type { User } from '@/lib/types';

/**
 * Regular expression to match @mentions in text.
 * Matches @word.word or @word format (alphanumeric + dots)
 */
const MENTION_REGEX = /@([a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*)/g;

/**
 * Get a user's display name (e.g., "John Smith")
 */
export function getUserDisplayName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

/**
 * Get a user's mention name (e.g., "john.smith")
 * This is what appears after the @ symbol
 */
export function getUserMentionName(user: User): string {
  return `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`;
}

/**
 * Get the full mention format (e.g., "@john.smith")
 */
export function getUserMentionFormat(user: User): string {
  return `@${getUserMentionName(user)}`;
}

/**
 * Extract all mentioned user IDs from text.
 * Returns an array of user IDs that were mentioned.
 */
export function extractMentions(text: string, users: User[]): string[] {
  const matches = text.matchAll(MENTION_REGEX);
  const mentionedUserIds: string[] = [];

  // Create a map of mention names to user IDs for fast lookup
  const mentionNameToUserId = new Map<string, string>();
  for (const user of users) {
    mentionNameToUserId.set(getUserMentionName(user), user.id);
  }

  for (const match of matches) {
    const mentionName = match[1].toLowerCase();
    const userId = mentionNameToUserId.get(mentionName);
    if (userId && !mentionedUserIds.includes(userId)) {
      mentionedUserIds.push(userId);
    }
  }

  return mentionedUserIds;
}

/**
 * Find user by mention name (the part after @)
 */
export function findUserByMentionName(mentionName: string, users: User[]): User | undefined {
  const normalizedMention = mentionName.toLowerCase();
  return users.find((user) => getUserMentionName(user) === normalizedMention);
}

/**
 * Parse mention positions in text.
 * Returns an array of { start, end, userId, mentionName } for each mention found.
 */
export interface MentionPosition {
  start: number;
  end: number;
  userId: string;
  mentionName: string;
  displayName: string;
}

export function parseMentionPositions(text: string, users: User[]): MentionPosition[] {
  const positions: MentionPosition[] = [];
  const regex = new RegExp(MENTION_REGEX.source, 'g');
  let match;

  // Create maps for fast lookup
  const mentionNameToUser = new Map<string, User>();
  for (const user of users) {
    mentionNameToUser.set(getUserMentionName(user), user);
  }

  while ((match = regex.exec(text)) !== null) {
    const mentionName = match[1].toLowerCase();
    const user = mentionNameToUser.get(mentionName);

    if (user) {
      positions.push({
        start: match.index,
        end: match.index + match[0].length,
        userId: user.id,
        mentionName: match[1],
        displayName: getUserDisplayName(user),
      });
    }
  }

  return positions;
}

/**
 * Filter users based on a search query.
 * Used for the autocomplete dropdown when typing @...
 */
export function filterUsersForMention(query: string, users: User[], excludeIds: string[] = []): User[] {
  const lowerQuery = query.toLowerCase();

  return users
    .filter((user) => !excludeIds.includes(user.id))
    .filter((user) => {
      const fullName = getUserDisplayName(user).toLowerCase();
      const mentionName = getUserMentionName(user);
      const email = user.email.toLowerCase();

      return (
        fullName.includes(lowerQuery) ||
        mentionName.includes(lowerQuery) ||
        email.includes(lowerQuery)
      );
    })
    .slice(0, 10); // Limit results
}

/**
 * Check if cursor is currently in a mention context (after typing @)
 * Returns the partial mention text if in mention context, null otherwise.
 */
export function getMentionContext(
  text: string,
  cursorPosition: number
): { query: string; startIndex: number } | null {
  // Look backwards from cursor to find the @ symbol
  let startIndex = cursorPosition - 1;

  while (startIndex >= 0) {
    const char = text[startIndex];

    // Found @, we're in a mention context
    if (char === '@') {
      const query = text.slice(startIndex + 1, cursorPosition);
      // Make sure there's no space in the query (would break the mention)
      if (!query.includes(' ')) {
        return { query, startIndex };
      }
      return null;
    }

    // Space or newline means we're not in a mention context
    if (char === ' ' || char === '\n') {
      return null;
    }

    startIndex--;
  }

  return null;
}

/**
 * Insert a mention at the given position, replacing the partial mention text.
 * Returns the new text with the mention inserted.
 */
export function insertMention(
  text: string,
  startIndex: number,
  cursorPosition: number,
  user: User
): { newText: string; newCursorPosition: number } {
  const before = text.slice(0, startIndex);
  const after = text.slice(cursorPosition);
  const mention = getUserMentionFormat(user);

  const newText = `${before}${mention} ${after}`;
  const newCursorPosition = before.length + mention.length + 1; // +1 for the space

  return { newText, newCursorPosition };
}
