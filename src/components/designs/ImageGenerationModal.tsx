/**
 * ImageGenerationModal - Modal for AI-generated realistic images
 *
 * Uses Google's Gemini to generate photorealistic renders
 * of solar installations from 3D canvas captures.
 *
 * Gated behind an unlock code (VITE_AI_REVIEW_UNLOCK_CODE).
 */

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, Lock, Download, RefreshCw } from 'lucide-react';
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

// Reuse the same unlock key as AI Review
const AI_REVIEW_UNLOCKED_KEY = 'ai-review-unlocked';

function isFeatureUnlocked(): boolean {
  return localStorage.getItem(AI_REVIEW_UNLOCKED_KEY) === 'true';
}

function unlockFeature(): void {
  localStorage.setItem(AI_REVIEW_UNLOCKED_KEY, 'true');
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
  designContext: DesignContext;
}

type Stage = 'locked' | 'ready' | 'generating' | 'done' | 'error';

export function ImageGenerationModal({
  open,
  onOpenChange,
  onCapture,
  designContext,
}: ImageGenerationModalProps) {
  const [stage, setStage] = useState<Stage>('ready');
  const [unlockCode, setUnlockCode] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (isUnlockCodeRequired() && !isFeatureUnlocked()) {
        setStage('locked');
      } else {
        setStage(generatedImage ? 'done' : 'ready');
      }
      setUnlockCode('');
      setUnlockError(null);
      setErrorMessage(null);
    }
  }, [open, generatedImage]);

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

    const canvasImage = onCapture();
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
      setGeneratedImage(result.image);
      setStage('done');
    } else {
      setErrorMessage(result.error || 'Failed to generate image');
      setStage('error');
    }
  }, [onCapture, designContext]);

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
    setStage('ready');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
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
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden border bg-muted/30">
              <img
                src={`data:image/png;base64,${generatedImage}`}
                alt="AI-generated photorealistic render"
                className="w-full h-auto"
              />
            </div>
            <DialogFooter>
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
