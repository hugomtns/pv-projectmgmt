/**
 * MentionInput - Textarea with @mention autocomplete
 *
 * Shows a dropdown of users when typing @ followed by a query.
 * Handles mention insertion and extraction.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import {
  getMentionContext,
  filterUsersForMention,
  insertMention,
  extractMentions,
  getUserDisplayName,
  getUserMentionName,
} from '@/lib/mentions/parser';
import type { User } from '@/lib/types';

interface MentionInputProps {
  value: string;
  onChange: (text: string, mentionedUserIds: string[]) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function MentionInput({
  value,
  onChange,
  placeholder = 'Type @ to mention someone...',
  className,
  minHeight = '80px',
  disabled = false,
  autoFocus = false,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionContext, setMentionContext] = useState<{
    query: string;
    startIndex: number;
  } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const users = useUserStore((state) => state.users);
  const currentUser = useUserStore((state) => state.currentUser);

  // Filter users based on mention query, excluding current user
  const filteredUsers = mentionContext
    ? filterUsersForMention(
        mentionContext.query,
        users,
        currentUser ? [currentUser.id] : []
      )
    : [];

  // Update dropdown position based on cursor
  const updateDropdownPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !mentionContext) return;

    const scrollTop = textarea.scrollTop;

    // Create a temporary element to measure cursor position
    const mirror = document.createElement('div');
    mirror.style.cssText = window.getComputedStyle(textarea).cssText;
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.overflow = 'hidden';
    mirror.style.height = 'auto';
    mirror.style.width = `${textarea.clientWidth}px`;

    // Get text up to the @ symbol
    const textBeforeAt = value.slice(0, mentionContext.startIndex);
    mirror.textContent = textBeforeAt;

    // Add a span for the @ symbol to get its position
    const span = document.createElement('span');
    span.textContent = '@';
    mirror.appendChild(span);

    document.body.appendChild(mirror);

    const spanRect = span.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    document.body.removeChild(mirror);

    // Calculate position relative to textarea
    const relativeTop = spanRect.top - mirrorRect.top - scrollTop;
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;

    setDropdownPosition({
      top: Math.min(relativeTop + lineHeight + 4, textarea.clientHeight - 200),
      left: Math.max(0, Math.min(spanRect.left - mirrorRect.left, textarea.clientWidth - 250)),
    });
  }, [mentionContext, value]);

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    // Check for mention context
    const context = getMentionContext(newText, cursorPos);
    setMentionContext(context);
    setShowDropdown(!!context && filteredUsers.length > 0);
    setSelectedIndex(0);

    // Extract mentions and notify parent
    const mentionedUserIds = extractMentions(newText, users);
    onChange(newText, mentionedUserIds);
  };

  // Handle key selection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || filteredUsers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        break;
      case 'Enter':
      case 'Tab':
        if (showDropdown && filteredUsers.length > 0) {
          e.preventDefault();
          selectUser(filteredUsers[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setMentionContext(null);
        break;
    }
  };

  // Select a user from dropdown
  const selectUser = (user: User) => {
    if (!mentionContext || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart || 0;
    const { newText, newCursorPosition } = insertMention(
      value,
      mentionContext.startIndex,
      cursorPos,
      user
    );

    // Extract mentions and notify parent
    const mentionedUserIds = extractMentions(newText, users);
    onChange(newText, mentionedUserIds);

    // Close dropdown
    setShowDropdown(false);
    setMentionContext(null);

    // Move cursor after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPosition;
        textareaRef.current.selectionEnd = newCursorPosition;
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Update dropdown visibility when filtered users change
  useEffect(() => {
    if (mentionContext) {
      setShowDropdown(filteredUsers.length > 0);
      updateDropdownPosition();
    }
  }, [mentionContext, filteredUsers.length, updateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setMentionContext(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none',
          className
        )}
        style={{ minHeight }}
      />

      {/* Mention dropdown */}
      {showDropdown && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-64 max-h-48 overflow-auto rounded-md border bg-popover p-1 shadow-md"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                index === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
              onClick={() => selectUser(user)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium">{getUserDisplayName(user)}</span>
                <span className="text-xs text-muted-foreground">
                  @{getUserMentionName(user)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
