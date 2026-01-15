import { useState, useMemo } from 'react';
import { useSiteStore } from '@/stores/siteStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { SiteCard } from './SiteCard';
import { CreateSiteDialog } from './CreateSiteDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, ArrowUpDown, Filter } from 'lucide-react';
import type { Site } from '@/lib/types';

type SortOption = 'score-desc' | 'score-asc' | 'date-desc' | 'date-asc' | 'name-asc';
type FilterOption = 'all' | 'green' | 'yellow' | 'red' | 'not-rated';

const SORT_LABELS: Record<SortOption, string> = {
  'score-desc': 'Score (High to Low)',
  'score-asc': 'Score (Low to High)',
  'date-desc': 'Newest First',
  'date-asc': 'Oldest First',
  'name-asc': 'Name (A-Z)',
};

const FILTER_LABELS: Record<FilterOption, string> = {
  all: 'All Sites',
  green: 'Green (70+)',
  yellow: 'Yellow (40-69)',
  red: 'Red (0-39)',
  'not-rated': 'Not Rated',
};

interface SiteListProps {
  projectId: string;
}

function filterSites(sites: Site[], filter: FilterOption): Site[] {
  switch (filter) {
    case 'green':
      return sites.filter((s) => s.scorecard?.compositeScore != null && s.scorecard.compositeScore >= 70);
    case 'yellow':
      return sites.filter(
        (s) =>
          s.scorecard?.compositeScore != null &&
          s.scorecard.compositeScore >= 40 &&
          s.scorecard.compositeScore < 70
      );
    case 'red':
      return sites.filter(
        (s) => s.scorecard?.compositeScore != null && s.scorecard.compositeScore < 40
      );
    case 'not-rated':
      return sites.filter((s) => s.scorecard?.compositeScore == null);
    default:
      return sites;
  }
}

function sortSites(sites: Site[], sort: SortOption): Site[] {
  const sorted = [...sites];
  switch (sort) {
    case 'score-desc':
      return sorted.sort((a, b) => {
        const aScore = a.scorecard?.compositeScore ?? -1;
        const bScore = b.scorecard?.compositeScore ?? -1;
        return bScore - aScore;
      });
    case 'score-asc':
      return sorted.sort((a, b) => {
        const aScore = a.scorecard?.compositeScore ?? Infinity;
        const bScore = b.scorecard?.compositeScore ?? Infinity;
        return aScore - bScore;
      });
    case 'date-desc':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'date-asc':
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

export function SiteList({ projectId }: SiteListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  const allSites = useSiteStore((state) => state.sites);
  const projectSites = allSites.filter((s) => s.projectId === projectId);

  // Apply filtering and sorting
  const sites = useMemo(() => {
    const filtered = filterSites(projectSites, filterBy);
    return sortSites(filtered, sortBy);
  }, [projectSites, filterBy, sortBy]);

  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  // Permission check for creating sites
  const canCreate = currentUser
    ? resolvePermissions(currentUser, 'sites', undefined, permissionOverrides, roles)
        .create
    : false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium">
          Sites {projectSites.length > 0 && `(${sites.length}${filterBy !== 'all' ? ` of ${projectSites.length}` : ''})`}
        </h3>
        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <Select value={filterBy} onValueChange={(v) => setFilterBy(v as FilterOption)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(FILTER_LABELS) as [FilterOption, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort dropdown */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canCreate && (
            <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-1 h-8">
              <Plus className="h-4 w-4" />
              Add Site
            </Button>
          )}
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
          {projectSites.length === 0
            ? 'No sites yet. Upload a KML file to add site boundaries.'
            : 'No sites match the current filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}

      {canCreate && (
        <CreateSiteDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          projectId={projectId}
        />
      )}
    </div>
  );
}
