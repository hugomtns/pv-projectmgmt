/**
 * MentionText - Renders text with highlighted @mentions
 *
 * Parses text for @mentions and renders them as styled spans.
 * Invalid mentions (users not found) are rendered as plain text.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import { parseMentionPositions } from '@/lib/mentions/parser';

interface MentionTextProps {
  text: string;
  className?: string;
}

export function MentionText({ text, className }: MentionTextProps) {
  const users = useUserStore((state) => state.users);

  const renderedContent = useMemo(() => {
    const positions = parseMentionPositions(text, users);

    if (positions.length === 0) {
      return <span>{text}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    positions.forEach((pos, index) => {
      // Add text before this mention
      if (pos.start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>{text.slice(lastIndex, pos.start)}</span>
        );
      }

      // Add the mention
      elements.push(
        <span
          key={`mention-${index}`}
          className="inline-flex items-center rounded bg-primary/10 px-1 py-0.5 text-primary font-medium"
          title={pos.displayName}
        >
          @{pos.mentionName}
        </span>
      );

      lastIndex = pos.end;
    });

    // Add remaining text after last mention
    if (lastIndex < text.length) {
      elements.push(<span key="text-end">{text.slice(lastIndex)}</span>);
    }

    return elements;
  }, [text, users]);

  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {renderedContent}
    </span>
  );
}
