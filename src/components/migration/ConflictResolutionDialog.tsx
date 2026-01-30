import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  ArrowRight,
} from 'lucide-react';
import type { MigrationConflict, ConflictResolution } from '@/lib/migrations/financialModelMigration';
import type { Project, Design } from '@/lib/types';
import { toast } from 'sonner';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: MigrationConflict[];
  projects: Project[];
  designs: Design[];
  onResolve: (resolutions: Record<string, ConflictResolution>) => void;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflicts,
  projects,
  designs,
  onResolve,
}: ConflictResolutionDialogProps) {
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentConflict = conflicts[currentIndex];
  const isLastConflict = currentIndex === conflicts.length - 1;
  const hasResolution = currentConflict && resolutions[getConflictKey(currentConflict)];

  function getConflictKey(conflict: MigrationConflict): string {
    return `${conflict.type}-${conflict.projectId}-${conflict.modelId || conflict.boqId}`;
  }

  const handleResolutionChange = (strategy: ConflictResolution['strategy'], designId?: string) => {
    if (!currentConflict) return;

    const resolution: ConflictResolution = {
      conflictType: currentConflict.type,
      projectId: currentConflict.projectId || '',
      strategy,
      designId,
    };

    setResolutions((prev) => ({
      ...prev,
      [getConflictKey(currentConflict)]: resolution,
    }));
  };

  const handleNext = () => {
    if (!hasResolution) {
      toast.error('Please select a resolution option');
      return;
    }

    if (isLastConflict) {
      // All conflicts resolved
      onResolve(resolutions);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!currentConflict) return null;

  const project = projects.find((p) => p.id === currentConflict.projectId);
  const projectDesigns = designs.filter((d) => d.projectId === currentConflict.projectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-600" />
            Resolve Migration Conflicts
          </DialogTitle>
          <DialogDescription>
            Conflict {currentIndex + 1} of {conflicts.length}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Conflict Info */}
            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                  {currentConflict.type === 'multiple_designs_one_model' &&
                    'Multiple Designs, One Financial Model'}
                  {currentConflict.type === 'orphan_model' && 'Orphan Financial Model'}
                  {currentConflict.type === 'orphan_boq' && 'Orphan BOQ'}
                  {currentConflict.type === 'no_designs' && 'No Designs Found'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {currentConflict.message}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-background">
                    Project: {project?.name || 'Unknown'}
                  </Badge>
                  {currentConflict.designIds && currentConflict.designIds.length > 0 && (
                    <Badge variant="outline" className="bg-background">
                      {currentConflict.designIds.length} Design
                      {currentConflict.designIds.length !== 1 && 's'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resolution Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Choose Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                {currentConflict.type === 'multiple_designs_one_model' && (
                  <RadioGroup
                    value={resolutions[getConflictKey(currentConflict)]?.strategy || ''}
                    onValueChange={(value) => {
                      const strategy = value as ConflictResolution['strategy'];
                      if (strategy === 'assign_to_first') {
                        handleResolutionChange(strategy, currentConflict.designIds?.[0]);
                      } else if (strategy === 'assign_to_specific') {
                        // Will set designId in the select below
                        handleResolutionChange(strategy, currentConflict.designIds?.[0]);
                      } else {
                        handleResolutionChange(strategy);
                      }
                    }}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="duplicate_to_all" id="duplicate" />
                      <Label htmlFor="duplicate" className="cursor-pointer flex-1">
                        <div>
                          <p className="font-medium">Duplicate to All Designs</p>
                          <p className="text-sm text-muted-foreground">
                            Create a copy of the financial model for each design
                          </p>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="assign_to_first" id="first" />
                      <Label htmlFor="first" className="cursor-pointer flex-1">
                        <div>
                          <p className="font-medium">Assign to First Design</p>
                          <p className="text-sm text-muted-foreground">
                            Assign to the first design, create empty models for others
                          </p>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="assign_to_specific" id="specific" />
                      <Label htmlFor="specific" className="cursor-pointer flex-1">
                        <div>
                          <p className="font-medium">Assign to Specific Design</p>
                          <p className="text-sm text-muted-foreground">
                            Choose which design should receive the financial model
                          </p>
                        </div>
                      </Label>
                    </div>

                    {resolutions[getConflictKey(currentConflict)]?.strategy ===
                      'assign_to_specific' && (
                      <div className="ml-9 mt-2">
                        <Label htmlFor="design-select" className="text-sm mb-2 block">
                          Select Design:
                        </Label>
                        <Select
                          value={resolutions[getConflictKey(currentConflict)]?.designId || ''}
                          onValueChange={(designId) =>
                            handleResolutionChange('assign_to_specific', designId)
                          }
                        >
                          <SelectTrigger id="design-select">
                            <SelectValue placeholder="Choose a design..." />
                          </SelectTrigger>
                          <SelectContent>
                            {projectDesigns.map((design) => (
                              <SelectItem key={design.id} value={design.id}>
                                {design.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="create_empty_all" id="empty" />
                      <Label htmlFor="empty" className="cursor-pointer flex-1">
                        <div>
                          <p className="font-medium">Create Empty Models</p>
                          <p className="text-sm text-muted-foreground">
                            Don't migrate this model, create empty models for all designs
                          </p>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="skip" id="skip" />
                      <Label htmlFor="skip" className="cursor-pointer flex-1">
                        <div>
                          <p className="font-medium">Skip</p>
                          <p className="text-sm text-muted-foreground">
                            Skip this model entirely (can migrate manually later)
                          </p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                )}

                {(currentConflict.type === 'orphan_model' ||
                  currentConflict.type === 'orphan_boq' ||
                  currentConflict.type === 'no_designs') && (
                  <RadioGroup
                    value={resolutions[getConflictKey(currentConflict)]?.strategy || ''}
                    onValueChange={(value) =>
                      handleResolutionChange(value as ConflictResolution['strategy'])
                    }
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="skip" id="skip-orphan" />
                      <Label htmlFor="skip-orphan" className="cursor-pointer flex-1">
                        <div>
                          <p className="font-medium">Skip</p>
                          <p className="text-sm text-muted-foreground">
                            Skip this item (original data will be preserved)
                          </p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              </CardContent>
            </Card>

            {/* Progress Indicator */}
            <div className="flex items-center gap-2 justify-center">
              {conflicts.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i < currentIndex
                      ? 'bg-green-500'
                      : i === currentIndex
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleBack} disabled={currentIndex === 0}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={!hasResolution}>
            {isLastConflict ? (
              <>
                Start Migration
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
