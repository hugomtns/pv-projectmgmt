import { useState } from 'react';
import { ChevronDown, ChevronRight, ClipboardCheck } from 'lucide-react';
import { ScorecardForm } from './ScorecardForm';
import type { Site } from '@/lib/types';

interface ScorecardSectionProps {
  site: Site;
  defaultExpanded?: boolean;
}

export function ScorecardSection({ site, defaultExpanded = false }: ScorecardSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <ClipboardCheck className="h-4 w-4 shrink-0" />
        <span className="font-medium text-sm">Site Selection Scorecard</span>
      </button>

      {isExpanded && (
        <div className="border-t px-3 pb-3">
          <ScorecardForm site={site} />
        </div>
      )}
    </div>
  );
}
