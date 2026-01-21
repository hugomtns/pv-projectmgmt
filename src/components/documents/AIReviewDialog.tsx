/**
 * AI Review Dialog
 *
 * Dialog for triggering AI-powered document version comparison.
 * Allows user to select a previous version to compare against the current version.
 */

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { runDocumentReview, type ReviewResult } from '@/lib/ai/documentReview';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  currentVersionId: string;
  onReviewComplete?: (result: ReviewResult) => void;
}

type ReviewStage = 'idle' | 'extracting' | 'analyzing' | 'creating-comments' | 'complete' | 'error';

export function AIReviewDialog({
  open,
  onOpenChange,
  documentId,
  currentVersionId,
  onReviewComplete,
}: AIReviewDialogProps) {
  const [selectedPreviousVersionId, setSelectedPreviousVersionId] = useState<string>('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [stage, setStage] = useState<ReviewStage>('idle');
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);

  // Fetch all versions for this document
  const versions = useLiveQuery(
    () =>
      db.documentVersions
        .where('documentId')
        .equals(documentId)
        .toArray()
        .then((v) => v.sort((a, b) => b.versionNumber - a.versionNumber)),
    [documentId]
  );

  // Filter to only show versions older than current
  const availableVersions = versions?.filter((v) => v.id !== currentVersionId) || [];

  // Auto-select the most recent previous version
  useEffect(() => {
    if (availableVersions.length > 0 && !selectedPreviousVersionId) {
      setSelectedPreviousVersionId(availableVersions[0].id);
    }
  }, [availableVersions, selectedPreviousVersionId]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStage('idle');
      setError(null);
      setResult(null);
      setIsReviewing(false);
    }
  }, [open]);

  const handleStartReview = async () => {
    if (!selectedPreviousVersionId) {
      setError('Please select a version to compare');
      return;
    }

    setIsReviewing(true);
    setError(null);
    setResult(null);

    const reviewResult = await runDocumentReview(
      documentId,
      currentVersionId,
      selectedPreviousVersionId,
      (stageKey, message) => {
        setStage(stageKey as ReviewStage);
        setProgressMessage(message);
      }
    );

    setIsReviewing(false);

    if (reviewResult.success) {
      setStage('complete');
      setResult(reviewResult);

      if (reviewResult.commentsCreated > 0) {
        toast.success(
          `AI Review complete: ${reviewResult.commentsCreated} comment${reviewResult.commentsCreated === 1 ? '' : 's'} added`
        );
      } else {
        toast.info('AI Review complete: No significant changes detected');
      }

      onReviewComplete?.(reviewResult);
    } else {
      setStage('error');
      setError(reviewResult.error || 'An unknown error occurred');
    }
  };

  const handleClose = () => {
    if (!isReviewing) {
      onOpenChange(false);
    }
  };

  const currentVersion = versions?.find((v) => v.id === currentVersionId);
  const selectedVersion = versions?.find((v) => v.id === selectedPreviousVersionId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Document Review
          </DialogTitle>
          <DialogDescription>
            Compare the current version with a previous version to identify changes.
            The AI will create highlight comments to mark discrepancies.
          </DialogDescription>
        </DialogHeader>

        {stage === 'idle' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current version</label>
              <div className="p-3 bg-muted rounded-md text-sm">
                Version {currentVersion?.versionNumber || '?'} -{' '}
                {currentVersion?.uploadedAt
                  ? new Date(currentVersion.uploadedAt).toLocaleDateString()
                  : 'Unknown'}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Compare with</label>
              <Select
                value={selectedPreviousVersionId}
                onValueChange={setSelectedPreviousVersionId}
                disabled={availableVersions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a previous version" />
                </SelectTrigger>
                <SelectContent>
                  {availableVersions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      Version {v.versionNumber} -{' '}
                      {new Date(v.uploadedAt).toLocaleDateString()} by {v.uploadedBy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableVersions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No previous versions available for comparison.
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
              <p className="font-medium mb-1">What the AI will do:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Extract and compare text from both versions</li>
                <li>Identify additions, deletions, and modifications</li>
                <li>Create highlight comments on the current version</li>
              </ul>
            </div>
          </div>
        )}

        {isReviewing && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <div>
              <p className="font-medium">{progressMessage}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Comparing Version {selectedVersion?.versionNumber} with Version{' '}
                {currentVersion?.versionNumber}
              </p>
            </div>
          </div>
        )}

        {stage === 'complete' && result && (
          <div className="py-6 space-y-4">
            <div className="text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-3" />
              <p className="font-medium">Review Complete</p>
            </div>

            <div className="bg-muted rounded-md p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Changes found:</span>
                <span className="font-medium">{result.changes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Comments created:</span>
                <span className="font-medium">{result.commentsCreated}</span>
              </div>
              {result.summary && (
                <div className="pt-2 border-t mt-2">
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                </div>
              )}
            </div>

            {result.changes.length > 0 && (
              <div className="text-sm space-y-1">
                <p className="font-medium">Change breakdown:</p>
                <div className="flex gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {result.changes.filter((c) => c.type === 'addition').length} added
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    {result.changes.filter((c) => c.type === 'modification').length} modified
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-pink-500" />
                    {result.changes.filter((c) => c.type === 'deletion').length} removed
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {stage === 'error' && (
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          {stage === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleStartReview}
                disabled={!selectedPreviousVersionId || availableVersions.length === 0}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Start Review
              </Button>
            </>
          )}

          {stage === 'complete' && (
            <Button onClick={handleClose}>Done</Button>
          )}

          {stage === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleStartReview}>
                <Sparkles className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
