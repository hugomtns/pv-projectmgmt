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

export function DesignFinancialModelPage() {
  const { designId } = useParams<{ designId: string }>();
  const navigate = useNavigate();

  const designs = useDesignStore((state) => state.designs);
  const design = designs.find((d) => d.id === designId);

  const projects = useProjectStore((state) => state.projects);
  const project = design ? projects.find((p) => p.id === design.projectId) : undefined;

  const model = useDesignFinancialStore((state) => state.getModelByDesign(designId || ''));
  const addModel = useDesignFinancialStore((state) => state.addModel);
  const updateModel = useDesignFinancialStore((state) => state.updateModel);
  const updateResults = useDesignFinancialStore((state) => state.updateResults);
  const deleteModel = useDesignFinancialStore((state) => state.deleteModel);
  const markAsWinner = useDesignFinancialStore((state) => state.markAsWinner);

  const currentUser = useUserStore((state) => state.currentUser);
  const canCreate = usePermission('financials', 'create');
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

  const handleCreateModel = () => {
    if (!designId || !design) return;
    const modelId = addModel(designId, `${design.name} - Financial Model`);
    if (modelId) {
      toast.success('Design financial model created');
    }
  };

  const handleDeleteModel = () => {
    if (!model) return;
    deleteModel(model.id);
    navigate(`/designs/${designId}`);
  };

  const handleCalculate = () => {
    if (!model) return;

    setIsCalculating(true);
    try {
      // Build inputs from design model
      const inputs = {
        capacity: model.capacity,
        p50_year_0_yield: model.p50_year_0_yield,
        capex_per_mw: undefined,
        ppa_price: model.ppa_price,
        om_cost_per_mw_year: undefined,
        capex_items: model.capex,
        opex_items: model.opex,
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

  if (!design || !designId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <h2 className="text-lg font-medium mb-2">Design not found</h2>
        <Button asChild>
          <Link to="/financials">Back to Financials</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title={model?.name || `${design.name} - Financial Model`}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/designs/${designId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Design
            </Link>
          </Button>
          {model && (
            <>
              {!model.isWinner && canModifyModel() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAsWinner}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  Mark as Winner
                </Button>
              )}
              {model.isWinner && (
                <Badge className="bg-yellow-500">
                  <Trophy className="mr-1 h-3 w-3" />
                  Winner
                </Badge>
              )}
              {canDelete && canModifyModel() && (
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
            </>
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
                  Start analyzing the financial viability of {design.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                {canCreate ? (
                  <Button onClick={handleCreateModel}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Create Financial Model
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    You don't have permission to create financial models
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            // Model exists - show tabs
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="inputs">Inputs</TabsTrigger>
                  <TabsTrigger value="capex">CAPEX</TabsTrigger>
                  <TabsTrigger value="opex">OPEX</TabsTrigger>
                  <TabsTrigger value="financing">Financing</TabsTrigger>
                  <TabsTrigger value="results">
                    Results
                    {model.results && (
                      <Badge variant="secondary" className="ml-2">
                        ✓
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowYieldDialog(true)}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Calculate Yield
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCalculate}
                    disabled={isCalculating}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {isCalculating ? 'Calculating...' : 'Calculate'}
                  </Button>
                  {model.results && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowExportDialog(true)}
                    >
                      Export PDF
                    </Button>
                  )}
                </div>
              </div>

              {/* Inputs Tab */}
              <TabsContent value="inputs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Core Inputs</CardTitle>
                    <CardDescription>
                      Capacity, yield, and revenue assumptions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="grid gap-2">
                        <Label htmlFor="capacity">Capacity (MW)</Label>
                        <Input
                          id="capacity"
                          type="number"
                          min="0"
                          step="0.1"
                          value={model.capacity}
                          onChange={(e) =>
                            updateModel(model.id, { capacity: parseFloat(e.target.value) || 0 })
                          }
                          disabled={!canModifyModel()}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="p50_yield">P50 Year 0 Yield (MWh)</Label>
                        <Input
                          id="p50_yield"
                          type="number"
                          min="0"
                          step="1"
                          value={model.p50_year_0_yield}
                          onChange={(e) =>
                            updateModel(model.id, { p50_year_0_yield: parseFloat(e.target.value) || 0 })
                          }
                          disabled={!canModifyModel()}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ppa_price">PPA Price (€/MWh)</Label>
                        <Input
                          id="ppa_price"
                          type="number"
                          min="0"
                          step="0.1"
                          value={model.ppa_price}
                          onChange={(e) =>
                            updateModel(model.id, { ppa_price: parseFloat(e.target.value) || 0 })
                          }
                          disabled={!canModifyModel()}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="global_margin">Global CAPEX Margin (%)</Label>
                        <Input
                          id="global_margin"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={(model.global_margin * 100).toFixed(1)}
                          onChange={(e) =>
                            updateModel(model.id, {
                              global_margin: parseFloat(e.target.value) / 100 || 0,
                            })
                          }
                          disabled={!canModifyModel()}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical/Economic Parameters */}
                <Card>
                  <CardHeader>
                    <CardTitle>Technical & Economic Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="grid gap-2">
                        <Label>Degradation Rate (%)</Label>
                        <Input
                          type="number"
                          value={(model.degradation_rate * 100).toFixed(2)}
                          onChange={(e) =>
                            updateModel(model.id, {
                              degradation_rate: parseFloat(e.target.value) / 100 || 0,
                            })
                          }
                          disabled={!canModifyModel()}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>PPA Escalation (%)</Label>
                        <Input
                          type="number"
                          value={(model.ppa_escalation * 100).toFixed(2)}
                          onChange={(e) =>
                            updateModel(model.id, {
                              ppa_escalation: parseFloat(e.target.value) / 100 || 0,
                            })
                          }
                          disabled={!canModifyModel()}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>O&M Escalation (%)</Label>
                        <Input
                          type="number"
                          value={(model.om_escalation * 100).toFixed(2)}
                          onChange={(e) =>
                            updateModel(model.id, {
                              om_escalation: parseFloat(e.target.value) / 100 || 0,
                            })
                          }
                          disabled={!canModifyModel()}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="grid gap-2">
                        <Label>Tax Rate (%)</Label>
                        <Input
                          type="number"
                          value={(model.tax_rate * 100).toFixed(1)}
                          onChange={(e) =>
                            updateModel(model.id, { tax_rate: parseFloat(e.target.value) / 100 || 0 })
                          }
                          disabled={!canModifyModel()}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Discount Rate (%)</Label>
                        <Input
                          type="number"
                          value={(model.discount_rate * 100).toFixed(2)}
                          onChange={(e) =>
                            updateModel(model.id, {
                              discount_rate: parseFloat(e.target.value) / 100 || 0,
                            })
                          }
                          disabled={!canModifyModel()}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Project Lifetime (years)</Label>
                        <Input
                          type="number"
                          value={model.project_lifetime}
                          onChange={(e) =>
                            updateModel(model.id, {
                              project_lifetime: parseInt(e.target.value) || 25,
                            })
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
                {model.results ? (
                  <FinancialResults results={model.results} />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calculator className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Click "Calculate" to run the financial model
                      </p>
                      <Button onClick={handleCalculate} disabled={isCalculating}>
                        <Calculator className="mr-2 h-4 w-4" />
                        {isCalculating ? 'Calculating...' : 'Calculate Now'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Financial Model?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the financial model for {design.name}. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteModel} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export PDF Dialog */}
      {model?.results && (
        <ExportPDFDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          results={model.results}
          globalMargin={model.global_margin}
          projectName={`${project?.name || ''} - ${model.name}`}
        />
      )}

      {/* Yield Calculator Dialog */}
      {model && (
        <YieldCalculatorDialog
          open={showYieldDialog}
          onOpenChange={setShowYieldDialog}
          modelId={model.id}
          projectId={model.projectId}
        />
      )}
    </div>
  );
}
