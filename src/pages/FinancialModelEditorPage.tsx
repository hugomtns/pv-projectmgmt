import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useDesignFinancialStore } from '@/stores/designFinancialStore';
import { useDesignStore } from '@/stores/designStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUserStore } from '@/stores/userStore';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  CapexManager,
  OpexManager,
  FinancingParametersForm,
} from '@/components/design-financials';
import { FinancialResults } from '@/components/financials/FinancialResults';
import { ExportPDFDialog } from '@/components/financials/ExportPDFDialog';
import { YieldCalculatorDialog } from '@/components/financials/YieldCalculatorDialog';
import { SolarFinanceCalculator } from '@/lib/calculator/calculator';
import { ArrowLeft, DollarSign, Calculator, Trophy, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Finance-centric financial model editor page.
 * Uses /financials/:projectId/:modelId route instead of /designs/:designId/financial
 */
export function FinancialModelEditorPage() {
  const { projectId, modelId } = useParams<{ projectId: string; modelId: string }>();
  const navigate = useNavigate();

  const projects = useProjectStore((state) => state.projects);
  const project = projects.find((p) => p.id === projectId);

  const model = useDesignFinancialStore((state) => state.getModelById(modelId || ''));
  const updateModel = useDesignFinancialStore((state) => state.updateModel);
  const updateResults = useDesignFinancialStore((state) => state.updateResults);
  const deleteModel = useDesignFinancialStore((state) => state.deleteModel);
  const markAsWinner = useDesignFinancialStore((state) => state.markAsWinner);

  const designs = useDesignStore((state) => state.designs);
  const design = model ? designs.find((d) => d.id === model.designId) : undefined;

  const currentUser = useUserStore((state) => state.currentUser);
  const canDelete = usePermission('financials', 'delete');

  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'inputs' | 'capex' | 'opex' | 'financing' | 'results'>(
    model?.results ? 'results' : 'inputs'
  );
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showYieldDialog, setShowYieldDialog] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check if current user can modify this model
  const canModifyModel = () => {
    if (!currentUser || !model) return false;
    const isAdmin = currentUser.roleId === 'role-admin';
    const isCreator = model.creatorId === currentUser.id;
    return isAdmin || isCreator;
  };

  const handleDeleteModel = () => {
    if (!model) return;
    deleteModel(model.id);
    navigate(`/financials/${projectId}`);
  };

  const handleCalculate = () => {
    if (!model) return;

    setIsCalculating(true);
    try {
      // Build inputs from design model
      // TODO: Include BOQ items when integrating BOQ as CAPEX source
      const inputs = {
        capacity: model.capacity,
        p50_year_0_yield: model.p50_year_0_yield,
        capex_per_mw: undefined,
        ppa_price: model.ppa_price,
        om_cost_per_mw_year: undefined,
        capex_items: model.additionalCapex || [],
        opex_items: model.opex || [],
        global_margin: model.global_margin,
        degradation_rate: model.degradation_rate,
        ppa_escalation: model.ppa_escalation,
        om_escalation: model.om_escalation,
        gearing_ratio: model.financing.gearing_ratio,
        interest_rate: model.financing.interest_rate,
        debt_tenor: model.financing.debt_tenor,
        target_dscr: model.financing.target_dscr,
        project_lifetime: model.project_lifetime,
        tax_rate: model.tax_rate,
        discount_rate: model.discount_rate,
      };

      const calculator = new SolarFinanceCalculator(inputs);
      const results = calculator.calculate();
      updateResults(model.id, results);
      setActiveTab('results');
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

  const handleMarkAsWinner = () => {
    if (!model) return;
    markAsWinner(model.id);
  };

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

  if (!model || !modelId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <h2 className="text-lg font-medium mb-2">Financial model not found</h2>
        <Button asChild>
          <Link to={`/financials/${projectId}`}>Back to Project Financials</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Financial Model" />
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6"
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link to="/financials" className="hover:text-foreground">
              Financials
            </Link>
            <span>/</span>
            <Link to={`/financials/${projectId}`} className="hover:text-foreground">
              {project.name}
            </Link>
            <span>/</span>
            <span className="text-foreground">{model.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/financials/${projectId}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Project
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  {model.name}
                  {model.isWinner && (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600">
                      <Trophy className="mr-1 h-3 w-3" />
                      Winner
                    </Badge>
                  )}
                </h1>
                {design && (
                  <p className="text-muted-foreground text-sm">
                    Design: {design.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {!model.isWinner && canModifyModel() && (
                <Button variant="outline" onClick={handleMarkAsWinner}>
                  <Trophy className="mr-2 h-4 w-4" />
                  Mark as Winner
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowYieldDialog(true)}
              >
                <Zap className="mr-2 h-4 w-4" />
                Yield Calculator
              </Button>
              <Button
                onClick={handleCalculate}
                disabled={isCalculating}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {isCalculating ? 'Calculating...' : 'Calculate'}
              </Button>
              {canDelete && canModifyModel() && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="capex">Additional CAPEX</TabsTrigger>
            <TabsTrigger value="opex">OPEX</TabsTrigger>
            <TabsTrigger value="financing">Financing</TabsTrigger>
            <TabsTrigger value="results" disabled={!model.results}>
              Results
            </TabsTrigger>
          </TabsList>

          {/* Inputs Tab */}
          <TabsContent value="inputs">
            <Card>
              <CardHeader>
                <CardTitle>Project Inputs</CardTitle>
                <CardDescription>
                  Core parameters for the financial model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity (MW)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={model.capacity}
                      onChange={(e) =>
                        updateModel(model.id, { capacity: parseFloat(e.target.value) || 0 })
                      }
                      disabled={!canModifyModel()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p50_yield">P50 Year 0 Yield (MWh)</Label>
                    <Input
                      id="p50_yield"
                      type="number"
                      value={model.p50_year_0_yield}
                      onChange={(e) =>
                        updateModel(model.id, { p50_year_0_yield: parseFloat(e.target.value) || 0 })
                      }
                      disabled={!canModifyModel()}
                    />
                    {model.yieldEstimate && (
                      <p className="text-xs text-muted-foreground">
                        Estimated from {model.yieldEstimate.source}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ppa_price">PPA Price (€/MWh)</Label>
                    <Input
                      id="ppa_price"
                      type="number"
                      value={model.ppa_price}
                      onChange={(e) =>
                        updateModel(model.id, { ppa_price: parseFloat(e.target.value) || 0 })
                      }
                      disabled={!canModifyModel()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="degradation">Degradation Rate (%/year)</Label>
                    <Input
                      id="degradation"
                      type="number"
                      step="0.1"
                      value={(model.degradation_rate * 100).toFixed(2)}
                      onChange={(e) =>
                        updateModel(model.id, { degradation_rate: (parseFloat(e.target.value) || 0) / 100 })
                      }
                      disabled={!canModifyModel()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ppa_escalation">PPA Escalation (%/year)</Label>
                    <Input
                      id="ppa_escalation"
                      type="number"
                      step="0.1"
                      value={(model.ppa_escalation * 100).toFixed(2)}
                      onChange={(e) =>
                        updateModel(model.id, { ppa_escalation: (parseFloat(e.target.value) || 0) / 100 })
                      }
                      disabled={!canModifyModel()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project_lifetime">Project Lifetime (years)</Label>
                    <Input
                      id="project_lifetime"
                      type="number"
                      value={model.project_lifetime}
                      onChange={(e) =>
                        updateModel(model.id, { project_lifetime: parseInt(e.target.value) || 25 })
                      }
                      disabled={!canModifyModel()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.1"
                      value={(model.tax_rate * 100).toFixed(2)}
                      onChange={(e) =>
                        updateModel(model.id, { tax_rate: (parseFloat(e.target.value) || 0) / 100 })
                      }
                      disabled={!canModifyModel()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discount_rate">Discount Rate (%)</Label>
                    <Input
                      id="discount_rate"
                      type="number"
                      step="0.1"
                      value={(model.discount_rate * 100).toFixed(2)}
                      onChange={(e) =>
                        updateModel(model.id, { discount_rate: (parseFloat(e.target.value) || 0) / 100 })
                      }
                      disabled={!canModifyModel()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="global_margin">Global CAPEX Margin (%)</Label>
                    <Input
                      id="global_margin"
                      type="number"
                      step="0.1"
                      value={(model.global_margin * 100).toFixed(2)}
                      onChange={(e) =>
                        updateModel(model.id, { global_margin: (parseFloat(e.target.value) || 0) / 100 })
                      }
                      disabled={!canModifyModel()}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CAPEX Tab */}
          <TabsContent value="capex">
            <CapexManager modelId={model.id} readOnly={!canModifyModel()} />
          </TabsContent>

          {/* OPEX Tab */}
          <TabsContent value="opex">
            <OpexManager modelId={model.id} readOnly={!canModifyModel()} />
          </TabsContent>

          {/* Financing Tab */}
          <TabsContent value="financing">
            <FinancingParametersForm modelId={model.id} readOnly={!canModifyModel()} />
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            {model.results && (
              <FinancialResults results={model.results} />
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {model.results && (
          <ExportPDFDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            results={model.results}
            globalMargin={model.global_margin}
            projectName={`${project.name} - ${model.name}`}
          />
        )}

        <YieldCalculatorDialog
          open={showYieldDialog}
          onOpenChange={setShowYieldDialog}
          modelId={model.id}
          projectId={projectId}
        />

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Financial Model?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The financial model "{model.name}" will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteModel} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
