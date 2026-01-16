import { useState, useMemo } from 'react';
import { usePerformanceLogStore } from '@/stores/performanceLogStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { PerformanceLogCard } from './PerformanceLogCard';
import { AddPerformanceLogDialog } from './AddPerformanceLogDialog';
import { PerformanceKPIPanel } from './PerformanceKPIPanel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingUp, BarChart3 } from 'lucide-react';

interface PerformanceLogListProps {
  projectId: string;
}

export function PerformanceLogList({ projectId }: PerformanceLogListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'summary'>('summary');

  // Get logs for this project
  const allLogs = usePerformanceLogStore((state) => state.logs);
  const logs = useMemo(
    () => allLogs.filter((l) => l.projectId === projectId),
    [allLogs, projectId]
  );

  // Compute KPIs in component to avoid infinite loop
  const kpis = useMemo(() => {
    if (logs.length === 0) {
      return {
        totalProduction: 0,
        avgPerformanceRatio: 0,
        avgAvailability: 0,
        totalCurtailment: 0,
        periodCount: 0,
        monthsWithData: 0,
      };
    }

    const totalProduction = logs.reduce((sum, l) => sum + l.actualProduction, 0);
    const prsWithValue = logs.filter((l) => l.performanceRatio !== undefined);
    const avgPerformanceRatio =
      prsWithValue.length > 0
        ? prsWithValue.reduce((sum, l) => sum + (l.performanceRatio || 0), 0) / prsWithValue.length
        : 0;
    const availsWithValue = logs.filter((l) => l.availabilityPercent !== undefined);
    const avgAvailability =
      availsWithValue.length > 0
        ? availsWithValue.reduce((sum, l) => sum + (l.availabilityPercent || 0), 0) / availsWithValue.length
        : 0;
    const totalCurtailment = logs.reduce((sum, l) => sum + (l.curtailment || 0), 0);

    const monthSet = new Set(logs.filter((l) => l.period === 'monthly').map((l) => l.startDate.substring(0, 7)));

    return {
      totalProduction,
      avgPerformanceRatio,
      avgAvailability,
      totalCurtailment,
      periodCount: logs.length,
      monthsWithData: monthSet.size,
    };
  }, [logs]);

  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  const canCreate = currentUser
    ? resolvePermissions(currentUser, 'performance_logs', undefined, permissionOverrides, roles).create
    : false;

  const hasLogs = logs.length > 0;

  // Sort logs by date (newest first)
  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [logs]
  );

  // Group logs by year
  const logsByYear = useMemo(() => {
    const groups: Record<string, typeof logs> = {};
    sortedLogs.forEach((log) => {
      const year = log.startDate.substring(0, 4);
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(log);
    });
    return groups;
  }, [sortedLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'logs' | 'summary')}>
          <TabsList>
            <TabsTrigger value="summary" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Logs {hasLogs && `(${logs.length})`}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {canCreate && (
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            Add Log
          </Button>
        )}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <PerformanceKPIPanel projectId={projectId} kpis={kpis} logs={sortedLogs} />
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <>
          {!hasLogs && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No performance logs</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Track production and performance data for this project.
              </p>
              {canCreate && (
                <Button onClick={() => setIsDialogOpen(true)} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add First Log
                </Button>
              )}
            </div>
          )}

          {hasLogs && (
            <div className="space-y-6">
              {Object.entries(logsByYear)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([year, yearLogs]) => (
                  <div key={year}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      {year} ({yearLogs.length} logs)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {yearLogs.map((log) => (
                        <PerformanceLogCard key={log.id} log={log} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      <AddPerformanceLogDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
      />
    </div>
  );
}
