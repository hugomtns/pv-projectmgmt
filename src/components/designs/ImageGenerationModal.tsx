/**
 * ImageGenerationModal - Modal for AI-generated realistic images
 *
 * Uses Google's Gemini to generate photorealistic renders
 * of solar installations from 3D canvas captures.
 *
 * Gated behind an unlock code (VITE_AI_REVIEW_UNLOCK_CODE).
 */

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, Lock, Download, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { generateRealisticImage } from '@/lib/gemini';
import type { DesignContext } from '@/lib/gemini';
import { compositeEquipmentOntoImage } from '@/lib/imageCompositing';
import type { ProjectedEquipment } from '@/lib/equipmentProjection';

const AI_IMAGE_GEN_UNLOCKED_KEY = 'ai-image-gen-unlocked';

function isFeatureUnlocked(): boolean {
  return localStorage.getItem(AI_IMAGE_GEN_UNLOCKED_KEY) === 'true';
}

function unlockFeature(): void {
  localStorage.setItem(AI_IMAGE_GEN_UNLOCKED_KEY, 'true');
}

function validateUnlockCode(code: string): boolean {
  const correctCode = import.meta.env.VITE_AI_REVIEW_UNLOCK_CODE;
  if (!correctCode) return true;
  return code === correctCode;
}

function isUnlockCodeRequired(): boolean {
  return !!import.meta.env.VITE_AI_REVIEW_UNLOCK_CODE;
}

interface ImageGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: () => string; // Returns canvas base64
  getDesignContext: () => DesignContext; // Getter — reads live data from the 3D canvas ref
  getEquipmentPositions: () => ProjectedEquipment[]; // Getter — returns projected equipment for compositing
}

type Stage = 'locked' | 'ready' | 'generating' | 'done' | 'error';

export function ImageGenerationModal({
  open,
  onOpenChange,
  onCapture,
  getDesignContext,
  getEquipmentPositions,
}: ImageGenerationModalProps) {
  const [stage, setStage] = useState<Stage>('ready');
  const [unlockCode, setUnlockCode] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [designContext, setDesignContext] = useState<DesignContext>({
    panelCount: 0,
    panelDimensions: { width: 2, height: 1 },
    tiltAngle: 0,
    equipmentTypes: [],
    cameraMode: '3d',
    electricalCounts: {},
    treeCount: 0,
    boundaryTypes: [],
  });

  // Snapshot design context and reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDesignContext(getDesignContext());
      if (isUnlockCodeRequired() && !isFeatureUnlocked()) {
        setStage('locked');
      } else {
        setStage(generatedImage ? 'done' : 'ready');
      }
      setUnlockCode('');
      setUnlockError(null);
      setErrorMessage(null);
    }
  }, [open, generatedImage, getDesignContext]);

  const handleUnlock = () => {
    if (validateUnlockCode(unlockCode)) {
      unlockFeature();
      setStage('ready');
      setUnlockError(null);
      toast.success('AI Image Generation unlocked!');
    } else {
      setUnlockError('Invalid unlock code');
    }
  };

  const handleGenerate = useCallback(async () => {
    setStage('generating');
    setErrorMessage(null);

    // Snapshot canvas and equipment positions at the same moment
    const canvasImage = onCapture();
    const equipmentPositions = getEquipmentPositions();

    if (!canvasImage) {
      setErrorMessage('Failed to capture canvas. Make sure a design is loaded.');
      setStage('error');
      return;
    }

    // Strip data URL prefix if present (API expects raw base64)
    const base64Data = canvasImage.replace(/^data:image\/\w+;base64,/, '');

    const result = await generateRealisticImage({
      canvasImage: base64Data,
      designContext,
    });

    if (result.success && result.image) {
      // Composite equipment at projected positions onto the AI-generated image
      const visibleEquipment = equipmentPositions.filter(e => e.visible);
      if (visibleEquipment.length > 0) {
        try {
          const composited = await compositeEquipmentOntoImage(result.image, visibleEquipment);
          setGeneratedImage(composited);
        } catch (err) {
          // Compositing failed — fall back to raw AI image
          console.warn('[AI compositing] Failed, using raw image:', err);
          setGeneratedImage(result.image);
        }
      } else {
        setGeneratedImage(result.image);
      }
      setStage('done');
    } else {
      setErrorMessage(result.error || 'Failed to generate image');
      setStage('error');
    }
  }, [onCapture, getEquipmentPositions, designContext]);

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${generatedImage}`;
    link.download = `ai-render-${Date.now()}.png`;
    link.click();
  };

  const handleClose = () => {
    if (stage === 'generating') return; // Don't close while generating
    onOpenChange(false);
  };

  const handleRegenerate = () => {
    setGeneratedImage(null);
    setExpanded(false);
    setStage('ready');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={expanded ? "max-w-[90vw] max-h-[90vh] flex flex-col" : "max-w-2xl"}>
        <DialogHeader>
          <DialogTitle>AI Image Generation</DialogTitle>
          <DialogDescription>
            Generate photorealistic renders of your solar design
          </DialogDescription>
        </DialogHeader>

        {/* Locked state */}
        {stage === 'locked' && (
          <div className="space-y-4 py-4">
            <div className="text-center py-4">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                This feature requires an unlock code to use.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter unlock code</label>
              <Input
                type="password"
                placeholder="Enter code..."
                value={unlockCode}
                onChange={(e) => {
                  setUnlockCode(e.target.value);
                  setUnlockError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUnlock();
                }}
              />
              {unlockError && (
                <p className="text-sm text-destructive">{unlockError}</p>
              )}
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleUnlock} disabled={!unlockCode}>
                <Lock className="h-4 w-4 mr-2" />
                Unlock
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Ready state */}
        {stage === 'ready' && (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mb-2">
              This will capture the current 3D view and generate a photorealistic
              render using AI. The process may take up to a minute.
            </p>
            <p className="text-xs text-muted-foreground">
              {designContext.panelCount} panels &middot; {designContext.tiltAngle.toFixed(0)}&deg; tilt &middot; {designContext.cameraMode} view
            </p>
            <DialogFooter className="pt-6 w-full">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={designContext.panelCount === 0}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Image
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Generating state */}
        {stage === 'generating' && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-sm font-medium mb-1">Generating realistic image...</p>
            <p className="text-xs text-muted-foreground">
              This may take up to a minute depending on complexity.
            </p>
          </div>
        )}

        {/* Done state */}
        {stage === 'done' && generatedImage && (
          <div className={expanded ? "flex-1 min-h-0 flex flex-col gap-4" : "space-y-4"}>
            <div className={`rounded-lg overflow-auto border bg-muted/30 ${expanded ? 'flex-1 min-h-0' : ''}`}>
              <img
                src={`data:image/png;base64,${generatedImage}`}
                alt="AI-generated photorealistic render"
                className={expanded ? "max-w-full max-h-full object-contain mx-auto" : "w-full h-auto"}
              />
            </div>
            <DialogFooter className="shrink-0">
              <Button variant="outline" size="icon" onClick={() => setExpanded(!expanded)} title={expanded ? 'Collapse' : 'Expand'}>
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={handleRegenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Error state */}
        {stage === 'error' && (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive mb-2">Generation Failed</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {errorMessage}
            </p>
            <DialogFooter className="pt-6 w-full">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleGenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
