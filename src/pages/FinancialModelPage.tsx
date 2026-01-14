import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useFinancialStore } from '@/stores/financialStore';
import { useProjectStore } from '@/stores/projectStore';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, DollarSign, Plus } from 'lucide-react';

export function FinancialModelPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const projects = useProjectStore((state) => state.projects);
  const project = projects.find((p) => p.id === projectId);

  const financialModels = useFinancialStore((state) => state.financialModels);
  const addFinancialModel = useFinancialStore((state) => state.addFinancialModel);
  const model = financialModels.find((m) => m.projectId === projectId);

  const canCreate = usePermission('financials', 'create');

  const handleCreateModel = () => {
    if (!projectId || !project) return;
    addFinancialModel(projectId, `${project.name} - Financial Model`);
  };

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <h2 className="text-lg font-medium mb-2">Project not found</h2>
        <Button asChild>
          <Link to="/financials">Back to Financials</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title={model?.name || `${project.name} - Financials`}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/financials">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Financials
            </Link>
          </Button>
        </div>
      </Header>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {!model ? (
            // No model exists - show create prompt
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Create Financial Model</CardTitle>
                <CardDescription>
                  Start analyzing the financial viability of {project.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                {canCreate ? (
                  <Button onClick={handleCreateModel}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Financial Model
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    You do not have permission to create financial models.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            // Model exists - show placeholder for future stories
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Summary</CardTitle>
                  <CardDescription>
                    Financial model for {project.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Capacity</div>
                      <div className="font-medium">{model.inputs.capacity} MW</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">P50 Yield</div>
                      <div className="font-medium">
                        {model.inputs.p50_year_0_yield.toLocaleString()} MWh
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">PPA Price</div>
                      <div className="font-medium">{model.inputs.ppa_price} /MWh</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Project Lifetime</div>
                      <div className="font-medium">{model.inputs.project_lifetime} years</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Input form, calculations, and charts will be added in upcoming stories.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
