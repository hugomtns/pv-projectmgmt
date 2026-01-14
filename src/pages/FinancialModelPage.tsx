import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useFinancialStore } from '@/stores/financialStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUserStore } from '@/stores/userStore';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FinancialInputForm } from '@/components/financials/FinancialInputForm';
import { FinancialResults } from '@/components/financials/FinancialResults';
import { ExportPDFDialog } from '@/components/financials/ExportPDFDialog';
import { SolarFinanceCalculator } from '@/lib/calculator/calculator';
import { ArrowLeft, DollarSign, Plus, Settings, BarChart3, FileDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function FinancialModelPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projects = useProjectStore((state) => state.projects);
  const project = projects.find((p) => p.id === projectId);

  const financialModels = useFinancialStore((state) => state.financialModels);
  const addFinancialModel = useFinancialStore((state) => state.addFinancialModel);
  const updateResults = useFinancialStore((state) => state.updateResults);
  const deleteFinancialModel = useFinancialStore((state) => state.deleteFinancialModel);
  const model = financialModels.find((m) => m.projectId === projectId);

  const currentUser = useUserStore((state) => state.currentUser);
  const canCreate = usePermission('financials', 'create');
  const canDelete = usePermission('financials', 'delete');

  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState(model?.results ? 'results' : 'inputs');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check if current user can modify this model
  const canModifyModel = () => {
    if (!currentUser || !model) return false;
    const isAdmin = currentUser.roleId === 'role-admin';
    const isCreator = model.creatorId === currentUser.id;
    return isAdmin || isCreator;
  };

  const handleCreateModel = () => {
    if (!projectId || !project) return;
    addFinancialModel(projectId, `${project.name} - Financial Model`);
  };

  const handleDeleteModel = () => {
    if (!model) return;
    deleteFinancialModel(model.id);
    navigate('/financials');
  };

  const handleCalculate = () => {
    if (!model) return;

    setIsCalculating(true);
    try {
      const calculator = new SolarFinanceCalculator(model.inputs);
      const results = calculator.calculate();
      updateResults(model.id, results);
      setActiveTab('results');
      // Scroll to top of results
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Calculation complete', {
        description: 'Financial metrics have been calculated successfully.',
      });
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Calculation failed', {
        description: error instanceof Error ? error.message : 'An error occurred during calculation.',
      });
    } finally {
      setIsCalculating(false);
    }
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
          {model && canDelete && canModifyModel() && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </Header>

      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
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
            // Model exists - show tabs with inputs and results
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="inputs" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Inputs
                  </TabsTrigger>
                  <TabsTrigger value="results" className="gap-2" disabled={!model.results}>
                    <BarChart3 className="h-4 w-4" />
                    Results
                    {!model.results && (
                      <span className="text-xs text-muted-foreground ml-1">(Calculate first)</span>
                    )}
                  </TabsTrigger>
                </TabsList>
                {model.results && (
                  <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                )}
              </div>

              <TabsContent value="inputs" className="mt-6">
                <FinancialInputForm
                  modelId={model.id}
                  inputs={model.inputs}
                  onCalculate={handleCalculate}
                  isCalculating={isCalculating}
                />
              </TabsContent>

              <TabsContent value="results" className="mt-6">
                {model.results ? (
                  <FinancialResults results={model.results} />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Configure your inputs and click Calculate to see results.
                      </p>
                      <Button onClick={() => setActiveTab('inputs')}>
                        Go to Inputs
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Export PDF Dialog */}
      {model?.results && (
        <ExportPDFDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          results={model.results}
          globalMargin={model.inputs.global_margin}
          projectName={project?.name}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Financial Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this financial model? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
