import { useState } from 'react';
import { usePerformanceLogStore } from '@/stores/performanceLogStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PerformancePeriod } from '@/lib/types/performanceLog';
import { PERFORMANCE_PERIOD_LABELS } from '@/lib/types/performanceLog';

interface AddPerformanceLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function AddPerformanceLogDialog({
  open,
  onOpenChange,
  projectId,
}: AddPerformanceLogDialogProps) {
  const createLog = usePerformanceLogStore((state) => state.createLog);

  // Calculate default dates for monthly period
  const getDefaultDates = () => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstOfMonth.toISOString().split('T')[0],
      end: lastOfMonth.toISOString().split('T')[0],
    };
  };

  const defaultDates = getDefaultDates();

  const [formData, setFormData] = useState({
    period: 'monthly' as PerformancePeriod,
    startDate: defaultDates.start,
    endDate: defaultDates.end,
    actualProduction: '',
    expectedProduction: '',
    irradiance: '',
    irradianceType: 'poa' as 'poa' | 'ghi',
    availabilityPercent: '',
    gridExport: '',
    curtailment: '',
    avgTemperature: '',
    notes: '',
    anomalies: '',
  });

  const handlePeriodChange = (period: PerformancePeriod) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    if (period === 'daily') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = yesterday.toISOString().split('T')[0];
      endDate = startDate;
    } else if (period === 'weekly') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
      endDate = new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0];
    } else {
      const dates = getDefaultDates();
      startDate = dates.start;
      endDate = dates.end;
    }

    setFormData((prev) => ({ ...prev, period, startDate, endDate }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.actualProduction) return;

    createLog({
      projectId,
      period: formData.period,
      startDate: formData.startDate,
      endDate: formData.endDate,
      actualProduction: parseFloat(formData.actualProduction),
      expectedProduction: formData.expectedProduction ? parseFloat(formData.expectedProduction) : undefined,
      irradiance: formData.irradiance ? parseFloat(formData.irradiance) : undefined,
      irradianceType: formData.irradiance ? formData.irradianceType : undefined,
      availabilityPercent: formData.availabilityPercent ? parseFloat(formData.availabilityPercent) : undefined,
      gridExport: formData.gridExport ? parseFloat(formData.gridExport) : undefined,
      curtailment: formData.curtailment ? parseFloat(formData.curtailment) : undefined,
      avgTemperature: formData.avgTemperature ? parseFloat(formData.avgTemperature) : undefined,
      notes: formData.notes.trim() || undefined,
      anomalies: formData.anomalies.trim() || undefined,
    });

    // Reset form
    const dates = getDefaultDates();
    setFormData({
      period: 'monthly',
      startDate: dates.start,
      endDate: dates.end,
      actualProduction: '',
      expectedProduction: '',
      irradiance: '',
      irradianceType: 'poa',
      availabilityPercent: '',
      gridExport: '',
      curtailment: '',
      avgTemperature: '',
      notes: '',
      anomalies: '',
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Performance Log</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Period */}
          <div className="space-y-2">
            <Label>Period</Label>
            <Select
              value={formData.period}
              onValueChange={(v) => handlePeriodChange(v as PerformancePeriod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PERFORMANCE_PERIOD_LABELS) as PerformancePeriod[]).map((period) => (
                  <SelectItem key={period} value={period}>
                    {PERFORMANCE_PERIOD_LABELS[period]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Production */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Actual Production (kWh) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.actualProduction}
                onChange={(e) => setFormData((prev) => ({ ...prev, actualProduction: e.target.value }))}
                placeholder="e.g., 125000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Production (kWh)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.expectedProduction}
                onChange={(e) => setFormData((prev) => ({ ...prev, expectedProduction: e.target.value }))}
                placeholder="From model/forecast"
              />
            </div>
          </div>

          {/* Irradiance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Irradiance (kWh/m²)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.irradiance}
                onChange={(e) => setFormData((prev) => ({ ...prev, irradiance: e.target.value }))}
                placeholder="e.g., 180"
              />
            </div>
            <div className="space-y-2">
              <Label>Irradiance Type</Label>
              <Select
                value={formData.irradianceType}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, irradianceType: v as 'poa' | 'ghi' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poa">POA (Plane of Array)</SelectItem>
                  <SelectItem value="ghi">GHI (Global Horizontal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Availability & Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Availability (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.availabilityPercent}
                onChange={(e) => setFormData((prev) => ({ ...prev, availabilityPercent: e.target.value }))}
                placeholder="e.g., 99.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Avg Temperature (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.avgTemperature}
                onChange={(e) => setFormData((prev) => ({ ...prev, avgTemperature: e.target.value }))}
                placeholder="e.g., 25"
              />
            </div>
          </div>

          {/* Grid Export & Curtailment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grid Export (kWh)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.gridExport}
                onChange={(e) => setFormData((prev) => ({ ...prev, gridExport: e.target.value }))}
                placeholder="Energy exported to grid"
              />
            </div>
            <div className="space-y-2">
              <Label>Curtailment (kWh)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.curtailment}
                onChange={(e) => setFormData((prev) => ({ ...prev, curtailment: e.target.value }))}
                placeholder="Lost production"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="General notes about this period..."
              rows={2}
            />
          </div>

          {/* Anomalies */}
          <div className="space-y-2">
            <Label>Anomalies / Issues</Label>
            <Textarea
              value={formData.anomalies}
              onChange={(e) => setFormData((prev) => ({ ...prev, anomalies: e.target.value }))}
              placeholder="Any issues, outages, or anomalies..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.actualProduction}>
              Add Log
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
