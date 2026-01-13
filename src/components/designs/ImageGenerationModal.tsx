/**
 * ImageGenerationModal - Modal for AI-generated realistic images
 *
 * Will use Google's Gemini to generate photorealistic renders
 * of solar installations from 3D canvas captures.
 *
 * Currently disabled pending API access.
 */

import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DesignContext } from '@/lib/gemini';

interface ImageGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: () => string; // Returns canvas base64
  designContext: DesignContext;
}

export function ImageGenerationModal({
  open,
  onOpenChange,
}: ImageGenerationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>AI Image Generation</DialogTitle>
          <DialogDescription>
            Generate photorealistic renders of your solar design
          </DialogDescription>
        </DialogHeader>

        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Feature Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            AI-powered image generation will transform your 3D designs into
            photorealistic renders. This feature is currently being configured.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
