import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Info } from 'lucide-react';
import { useProjectFinancialSettingsStore } from '@/stores/projectFinancialSettingsStore';
import type { DefaultFinancialAssumptions } from '@/lib/types/financial';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface ProjectFinancialSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ProjectFinancialSettingsDialog({
  open,
  onOpenChange,
  projectId,
}: ProjectFinancialSettingsDialogProps) {
  const settings = useProjectFinancialSettingsStore((state) =>
    state.getSettingsByProject(projectId)
  );
  const createSettings = useProjectFinancialSettingsStore((state) => state.createSettings);
  const updateSettings = useProjectFinancialSettingsStore((state) => state.updateSettings);

  const [formData, setFormData] = useState<DefaultFinancialAssumptions>(
    settings?.defaultAssumptions || {
      ppa_escalation: 0.0,
      om_escalation: 0.01,
      degradation_rate: 0.004,
      tax_rate: 0.25,
      discount_rate: 0.08,
      project_lifetime: 25,
    }
  );

  // Update form when settings change
  useEffect(() => {
    if (settings) {
      setFormData(settings.defaultAssumptions);
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!settings) {
      // Create new settings
      createSettings(projectId, formData);
    } else {
      // Update existing settings
      updateSettings(settings.id, {
        defaultAssumptions: formData,
      });
    }

    onOpenChange(false);
    toast.success('Project financial settings saved');
  };

  const handleReset = () => {
    setFormData({
      ppa_escalation: 0.0,
      om_escalation: 0.01,
      degradation_rate: 0.004,
      tax_rate: 0.25,
      discount_rate: 0.08,
      project_lifetime: 25,
    });
    toast.info('Reset to default values');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Financial Settings
          </DialogTitle>
          <DialogDescription>
            Configure default financial assumptions for all design models in this project.
            These settings will be applied to new design financial models.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Economic Parameters */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2">
                Economic Parameters
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="ppa_escalation">PPA Escalation (Annual)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Annual increase in PPA price</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="ppa_escalation"
                      type="number"
                      min="0"
                      max="1"
                      step="0.001"
                      value={formData.ppa_escalation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ppa_escalation: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <Badge variant="secondary">
                      {(formData.ppa_escalation * 100).toFixed(2)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="om_escalation">O&M Escalation (Annual)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Annual increase in O&M costs</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="om_escalation"
                      type="number"
                      min="0"
                      max="1"
                      step="0.001"
                      value={formData.om_escalation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          om_escalation: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <Badge variant="secondary">
                      {(formData.om_escalation * 100).toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Parameters */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Technical Parameters</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="degradation_rate">Degradation Rate (Annual)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Annual decline in PV output</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="degradation_rate"
                      type="number"
                      min="0"
                      max="1"
                      step="0.001"
                      value={formData.degradation_rate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          degradation_rate: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <Badge variant="secondary">
                      {(formData.degradation_rate * 100).toFixed(2)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="project_lifetime">Project Lifetime (Years)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Total operational years</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="project_lifetime"
                      type="number"
                      min="1"
                      max="40"
                      step="1"
                      value={formData.project_lifetime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          project_lifetime: parseInt(e.target.value) || 25,
                        })
                      }
                    />
                    <Badge variant="secondary">{formData.project_lifetime} years</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Parameters */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Financial Parameters</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="tax_rate">Corporate Tax Rate</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Effective tax rate on project income</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="tax_rate"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tax_rate: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <Badge variant="secondary">
                      {(formData.tax_rate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="discount_rate">Discount Rate (WACC)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Weighted average cost of capital for NPV</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="discount_rate"
                      type="number"
                      min="0"
                      max="1"
                      step="0.001"
                      value={formData.discount_rate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_rate: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <Badge variant="secondary">
                      {(formData.discount_rate * 100).toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> These settings will be applied as defaults to new design
                financial models. Existing models will not be affected. You can override these
                values individually for each design.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Settings</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
