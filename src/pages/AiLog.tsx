import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useAiLogStore } from '@/stores/aiLogStore';
import { useUserStore } from '@/stores/userStore';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AiFeature, AiLogStatus } from '@/lib/types/aiLog';

const FEATURE_LABELS: Record<AiFeature, string> = {
  'image-generation': 'Image Generation',
  'document-review': 'Document Review',
  'spec-sheet-parsing': 'Spec Sheet Parsing',
};

function StatusBadge({ status }: { status: AiLogStatus }) {
  const variant = status === 'success' ? 'default' : 'destructive';
  return <Badge variant={variant}>{status}</Badge>;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(entry: { tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }): string {
  if (!entry.tokenUsage?.totalTokens) return '-';
  const { promptTokens, completionTokens, totalTokens } = entry.tokenUsage;
  const parts: string[] = [];
  if (promptTokens) parts.push(`${promptTokens} in`);
  if (completionTokens) parts.push(`${completionTokens} out`);
  return parts.length > 0 ? `${totalTokens} (${parts.join(', ')})` : String(totalTokens);
}

export function AiLog() {
  const loadEntries = useAiLogStore((s) => s.loadEntries);
  const entries = useAiLogStore((s) => s.entries);
  const totalCount = useAiLogStore((s) => s.totalCount);
  const isLoading = useAiLogStore((s) => s.isLoading);
  const filters = useAiLogStore((s) => s.filters);
  const setFilters = useAiLogStore((s) => s.setFilters);
  const clearFilters = useAiLogStore((s) => s.clearFilters);
  const clearAll = useAiLogStore((s) => s.clearAll);
  const currentPage = useAiLogStore((s) => s.currentPage);
  const pageSize = useAiLogStore((s) => s.pageSize);
  const setPage = useAiLogStore((s) => s.setPage);
  const currentUser = useUserStore((s) => s.currentUser);

  const isAdmin = currentUser?.roleId === 'role-admin';

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  if (!isAdmin) {
    return <Navigate to="/projects" replace />;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasFilters = filters.feature || filters.status || filters.dateFrom || filters.dateTo;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="AI Log" />

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Select
              value={filters.feature ?? 'all'}
              onValueChange={(v) => setFilters({ feature: v === 'all' ? undefined : v as AiFeature })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All features" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All features</SelectItem>
                <SelectItem value="image-generation">Image Generation</SelectItem>
                <SelectItem value="document-review">Document Review</SelectItem>
                <SelectItem value="spec-sheet-parsing">Spec Sheet Parsing</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status ?? 'all'}
              onValueChange={(v) => setFilters({ status: v === 'all' ? undefined : v as AiLogStatus })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}

            <div className="flex-1" />

            <span className="text-sm text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
            </span>

            <Button variant="outline" size="sm" onClick={clearAll}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px]">Timestamp</TableHead>
                  <TableHead className="w-[150px]">Feature</TableHead>
                  <TableHead className="w-[200px]">Model</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Duration</TableHead>
                  <TableHead className="w-[80px] text-right">HTTP</TableHead>
                  <TableHead className="w-[160px] text-right">Tokens</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No AI log entries yet. Entries are recorded when AI features are used.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs font-mono">
                        {new Date(entry.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {FEATURE_LABELS[entry.feature]}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{entry.model}</TableCell>
                      <TableCell>
                        <StatusBadge status={entry.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {formatDuration(entry.durationMs)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {entry.httpStatus ?? '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {formatTokens(entry)}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-[300px] truncate" title={entry.error}>
                        {entry.error ?? ''}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
