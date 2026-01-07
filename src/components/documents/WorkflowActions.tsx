import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDocumentStore } from '@/stores/documentStore';
import { useUserStore } from '@/stores/userStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import { CheckCircle2, XCircle, Send, FileEdit } from 'lucide-react';
import type { DocumentStatus } from '@/lib/types/document';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WorkflowActionsProps {
  documentId: string;
  currentStatus: DocumentStatus;
}

export function WorkflowActions({ documentId, currentStatus }: WorkflowActionsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{
    status: DocumentStatus;
    label: string;
  } | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateDocumentStatus = useDocumentStore((state) => state.updateDocumentStatus);
  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  // Get permissions
  const permissions = getDocumentPermissions(
    currentUser,
    documentId,
    permissionOverrides,
    roles
  );

  const canUpdate = permissions.update;

  const handleActionClick = (status: DocumentStatus, label: string) => {
    setSelectedAction({ status, label });
    setNote('');
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!selectedAction) return;

    setIsSubmitting(true);
    try {
      const success = await updateDocumentStatus(
        documentId,
        selectedAction.status,
        note.trim() || undefined
      );

      if (success) {
        setShowDialog(false);
        setNote('');
        setSelectedAction(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setShowDialog(false);
      setNote('');
      setSelectedAction(null);
    }
  };

  if (!canUpdate) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Submit for Review (draft → in_review) */}
        {currentStatus === 'draft' && (
          <Button
            size="sm"
            onClick={() => handleActionClick('in_review', 'Submit for Review')}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Submit for Review
          </Button>
        )}

        {/* Approve (in_review → approved) */}
        {currentStatus === 'in_review' && (
          <>
            <Button
              size="sm"
              onClick={() => handleActionClick('approved', 'Approve')}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleActionClick('changes_requested', 'Request Changes')}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Request Changes
            </Button>
          </>
        )}

        {/* Re-submit for Review & Back to Draft (changes_requested → in_review or draft) */}
        {currentStatus === 'changes_requested' && (
          <>
            <Button
              size="sm"
              onClick={() => handleActionClick('in_review', 'Re-submit for Review')}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Re-submit for Review
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleActionClick('draft', 'Back to Draft')}
              className="gap-2"
            >
              <FileEdit className="h-4 w-4" />
              Back to Draft
            </Button>
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAction?.label}</DialogTitle>
            <DialogDescription>
              {selectedAction?.status === 'approved' &&
                'Approve this document and mark it as finalized.'}
              {selectedAction?.status === 'in_review' && (
                currentStatus === 'draft'
                  ? 'Submit this document for review.'
                  : 'Re-submit this document for review.'
              )}
              {selectedAction?.status === 'changes_requested' &&
                'Request changes to this document.'}
              {selectedAction?.status === 'draft' &&
                'Move this document back to draft status.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note about this status change..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
