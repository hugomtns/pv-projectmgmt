import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/projectStore';
import { useDesignFinancialStore } from '@/stores/designFinancialStore';
import { useProjectFinancialSettingsStore } from '@/stores/projectFinancialSettingsStore';
import {
  WinnerCard,
  DesignFinancialComparison,
  ProjectFinancialSettingsDialog,
} from '@/components/design-financials';
import {
  ArrowLeft,
  Settings,
  TrendingUp,
  Package,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  FinancialMigrationBanner,
  FinancialMigrationDialog,
} from '@/components/migration';
import {
  checkFinancialMigrationNeeded,
  markFinancialMigrationCompleted,
} from '@/lib/initializeStores';

export function ProjectFinancialOverview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const projects = useProjectStore((state) => state.projects);
  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);

  // Get all models and memoize to prevent infinite loops
  const allModels = useDesignFinancialStore((state) => state.designFinancialModels);
  const models = useMemo(
    () => allModels.filter((m) => m.projectId === projectId),
    [allModels, projectId]
  );

  // Get all settings and memoize
  const allSettings = useProjectFinancialSettingsStore((state) => state.settings);
  const settings = useMemo(
    () => allSettings.find((s) => s.projectId === projectId),
    [allSettings, projectId]
  );

  // Migration state
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(() => checkFinancialMigrationNeeded());

  // Check migration status when data changes
  useEffect(() => {
    const status = checkFinancialMigrationNeeded();
    setMigrationStatus(status);
  }, [allModels, allSettings]);

  if (!project || !projectId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <h2 className="text-lg font-medium mb-2">Project not found</h2>
        <Button asChild>
          <Link to="/financials">Back to Financials</Link>
        </Button>
      </div>
    );
  }

  const handleViewDesign = useCallback((designId: string) => {
    navigate(`/designs/${designId}?tab=financial`);
  }, [navigate]);

  const handleMarkWinner = useCallback((modelId: string) => {
    useDesignFinancialStore.getState().markAsWinner(modelId);
  }, []);

  const handleChangeWinner = useCallback(() => {
    // User can change winner via comparison table
    // This is a no-op since winner changes happen through the comparison table
  }, []);

  const handleStartMigration = useCallback(() => {
    setMigrationDialogOpen(true);
  }, []);

  const handleDismissMigration = useCallback(() => {
    // User dismissed the banner - they can see it again on next visit
  }, []);

  const handleMigrationComplete = useCallback(() => {
    markFinancialMigrationCompleted();
    setMigrationStatus(checkFinancialMigrationNeeded());
    setMigrationDialogOpen(false);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title={`${project.name} - Financial Analysis`}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/financials">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Financials
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsDialogOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Project Settings
          </Button>
        </div>
      </Header>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          {/* Migration Banner */}
          {migrationStatus.needed && (
            <FinancialMigrationBanner
              oldModelsCount={migrationStatus.oldModelsCount}
              oldBoqsCount={migrationStatus.oldBoqsCount}
              onStartMigration={handleStartMigration}
              onDismiss={handleDismissMigration}
            />
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Design Financial Models</p>
                    <p className="text-2xl font-bold">{models.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Models with Results</p>
                    <p className="text-2xl font-bold">
                      {models.filter((m) => m.results).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Settings className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Project Settings</p>
                    <p className="text-2xl font-bold">{settings ? 'Configured' : 'Not Set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Winner Card */}
          <WinnerCard
            projectId={projectId}
            onViewDetails={handleViewDesign}
            onChangeWinner={handleChangeWinner}
          />

          {/* Design Comparison Table */}
          <DesignFinancialComparison
            projectId={projectId}
            onViewDesign={handleViewDesign}
            onMarkWinner={handleMarkWinner}
          />

          {/* Empty State - No Models */}
          {models.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Design Financial Models</h3>
                <p className="text-muted-foreground mb-4">
                  Create designs for this project, then add financial models to each design.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" asChild>
                    <Link to={`/projects/${projectId}`}>View Project</Link>
                  </Button>
                  <Button onClick={() => setSettingsDialogOpen(true)}>
                    Configure Project Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <ProjectFinancialSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        projectId={projectId}
      />

      {/* Migration Dialog */}
      <FinancialMigrationDialog
        open={migrationDialogOpen}
        onOpenChange={setMigrationDialogOpen}
        onComplete={handleMigrationComplete}
      />
    </div>
  );
}
