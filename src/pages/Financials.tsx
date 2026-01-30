import { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useDesignFinancialStore } from '@/stores/designFinancialStore';
import { useProjectFinancialSettingsStore } from '@/stores/projectFinancialSettingsStore';
import { useProjectStore } from '@/stores/projectStore';
import { useDesignStore } from '@/stores/designStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  Trophy,
  ExternalLink,
  ArrowRight,
  Package,
} from 'lucide-react';
import {
  FinancialMigrationBanner,
  FinancialMigrationDialog,
} from '@/components/migration';
import {
  checkFinancialMigrationNeeded,
  markFinancialMigrationCompleted,
} from '@/lib/initializeStores';

export function Financials() {
  const navigate = useNavigate();
  const projects = useProjectStore((state) => state.projects);
  const designs = useDesignStore((state) => state.designs);
  const designFinancialModels = useDesignFinancialStore((state) => state.designFinancialModels);
  const allSettings = useProjectFinancialSettingsStore((state) => state.settings);

  // Migration state
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(() => checkFinancialMigrationNeeded());

  // Check migration status when data changes
  useEffect(() => {
    const status = checkFinancialMigrationNeeded();
    setMigrationStatus(status);
  }, [designFinancialModels, allSettings]);

  // Build project data with financial statistics (memoized to prevent infinite loops)
  const projectsWithFinancials = useMemo(() => {
    return projects.map((project) => {
      const projectDesigns = designs.filter((d) => d.projectId === project.id);
      const projectModels = designFinancialModels.filter((m) => m.projectId === project.id);
      const modelsWithResults = projectModels.filter((m) => m.results);
      const winnerModel = projectModels.find((m) => m.isWinner);
      const settings = allSettings.find((s) => s.projectId === project.id);

      return {
        project,
        designCount: projectDesigns.length,
        modelCount: projectModels.length,
        resultsCount: modelsWithResults.length,
        winnerModel,
        hasSettings: !!settings,
      };
    });
  }, [projects, designs, designFinancialModels, allSettings]);

  // Filter to only show projects with financial models or settings
  const projectsWithFinancialActivity = useMemo(() => {
    return projectsWithFinancials.filter(
      (p) => p.modelCount > 0 || p.hasSettings
    );
  }, [projectsWithFinancials]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const handleNavigateToProject = useCallback((projectId: string) => {
    navigate(`/financials/${projectId}`);
  }, [navigate]);

  const handleStartMigration = useCallback(() => {
    setMigrationDialogOpen(true);
  }, []);

  const handleDismissMigration = useCallback(() => {
    // User dismissed the banner - they can see it again on next visit
    console.log('Migration banner dismissed');
  }, []);

  const handleMigrationComplete = useCallback(() => {
    markFinancialMigrationCompleted();
    setMigrationStatus(checkFinancialMigrationNeeded());
    setMigrationDialogOpen(false);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Financial Analysis">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingUp className="h-4 w-4" />
            <span>Compare and analyze design financial models</span>
          </div>
        </div>
      </Header>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {/* Migration Banner */}
          {migrationStatus.needed && (
            <div className="mb-6">
              <FinancialMigrationBanner
                oldModelsCount={migrationStatus.oldModelsCount}
                oldBoqsCount={migrationStatus.oldBoqsCount}
                onStartMigration={handleStartMigration}
                onDismiss={handleDismissMigration}
              />
            </div>
          )}

          {projectsWithFinancialActivity.length === 0 ? (
            /* Empty State */
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Financial Models Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create design financial models from the project or design detail pages.
                </p>
                {projects.length > 0 ? (
                  <Button asChild>
                    <Link to="/projects">
                      Go to Projects
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Create a project first to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Projects</p>
                        <p className="text-2xl font-bold">{projectsWithFinancialActivity.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Models</p>
                        <p className="text-2xl font-bold">
                          {projectsWithFinancialActivity.reduce((sum, p) => sum + p.modelCount, 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">With Results</p>
                        <p className="text-2xl font-bold">
                          {projectsWithFinancialActivity.reduce((sum, p) => sum + p.resultsCount, 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Winners Selected</p>
                        <p className="text-2xl font-bold">
                          {projectsWithFinancialActivity.filter((p) => p.winnerModel).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Projects List */}
              <Card>
                <CardContent className="p-0">
                  <div className="border rounded-lg bg-card overflow-hidden">
                    {/* Header Row */}
                    <div
                      className="grid border-b border-border bg-muted/50"
                      style={{
                        gridTemplateColumns: 'minmax(250px, 2fr) 120px 120px 120px minmax(200px, 1.5fr) 120px 80px',
                      }}
                    >
                      <div className="px-4 py-3 text-sm font-medium text-muted-foreground">
                        Project
                      </div>
                      <div className="px-4 py-3 text-sm font-medium text-muted-foreground text-center">
                        Designs
                      </div>
                      <div className="px-4 py-3 text-sm font-medium text-muted-foreground text-center">
                        Models
                      </div>
                      <div className="px-4 py-3 text-sm font-medium text-muted-foreground text-center">
                        Results
                      </div>
                      <div className="px-4 py-3 text-sm font-medium text-muted-foreground">
                        Winner Design
                      </div>
                      <div className="px-4 py-3 text-sm font-medium text-muted-foreground">
                        Updated
                      </div>
                      <div className="px-4 py-3 text-sm font-medium text-muted-foreground text-right">
                        Actions
                      </div>
                    </div>

                    {/* Data Rows */}
                    {projectsWithFinancialActivity.map(({ project, designCount, modelCount, resultsCount, winnerModel }) => {
                      const winnerDesign = winnerModel
                        ? designs.find((d) => d.id === winnerModel.designId)
                        : null;

                      return (
                        <div
                          key={project.id}
                          className="grid border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer"
                          style={{
                            gridTemplateColumns:
                              'minmax(250px, 2fr) 120px 120px 120px minmax(200px, 1.5fr) 120px 80px',
                          }}
                          onClick={() => handleNavigateToProject(project.id)}
                        >
                          <div className="px-4 py-3 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/10 shrink-0">
                              <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <span className="text-sm font-medium truncate">{project.name}</span>
                              <div
                                className="text-xs text-muted-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link
                                  to={`/projects/${project.id}`}
                                  className="hover:text-foreground hover:underline inline-flex items-center gap-1"
                                >
                                  View Project
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                          </div>
                          <div className="px-4 py-3 flex items-center justify-center">
                            <Badge variant="secondary">{designCount}</Badge>
                          </div>
                          <div className="px-4 py-3 flex items-center justify-center">
                            <Badge variant={modelCount > 0 ? 'default' : 'outline'}>
                              {modelCount}
                            </Badge>
                          </div>
                          <div className="px-4 py-3 flex items-center justify-center">
                            <Badge variant={resultsCount > 0 ? 'default' : 'outline'}>
                              {resultsCount}
                            </Badge>
                          </div>
                          <div className="px-4 py-3 flex items-center">
                            {winnerDesign ? (
                              <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm truncate">{winnerDesign.name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )}
                          </div>
                          <div className="px-4 py-3 flex items-center text-sm text-muted-foreground">
                            {formatDate(project.updatedAt)}
                          </div>
                          <div className="px-4 py-3 flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToProject(project.id);
                              }}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Migration Dialog */}
      <FinancialMigrationDialog
        open={migrationDialogOpen}
        onOpenChange={setMigrationDialogOpen}
        onComplete={handleMigrationComplete}
      />
    </div>
  );
}
