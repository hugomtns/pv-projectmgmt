import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDesignStore } from '@/stores/designStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { CheckCircle2, XCircle, Send, FileEdit } from 'lucide-react';
import type { Design } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DesignWorkflowActionsProps {
  designId: string;
  currentStatus: Design['status'];
}

export function DesignWorkflowActions({ designId, currentStatus }: DesignWorkflowActionsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{
    status: Design['status'];
    label: string;
  } | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateDesignStatus = useDesignStore((state) => state.updateDesignStatus);
  const designs = useDesignStore((state) => state.designs);
  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  const design = designs.find(d => d.id === designId);

  if (!currentUser || !design) return null;

  // Get permissions
  const permissions = resolvePermissions(
    currentUser,
    'designs',
    designId,
    permissionOverrides,
    roles
  );

  const isCreator = design.creatorId === currentUser.id;
  const isSystemAdmin = currentUser.roleId === 'role-admin';
  const canUpdate = permissions.update || isCreator || isSystemAdmin;

  const handleActionClick = (status: Design['status'], label: string) => {
    setSelectedAction({ status, label });
    setNote('');
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!selectedAction) return;

    setIsSubmitting(true);
    try {
      const success = await updateDesignStatus(
        designId,
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
        {/* Submit for Review (draft → review) */}
        {currentStatus === 'draft' && (
          <Button
            size="sm"
            onClick={() => handleActionClick('review', 'Submit for Review')}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Submit for Review
          </Button>
        )}

        {/* Approve or Reject (review → approved or rejected) */}
        {currentStatus === 'review' && (
          <>
            <Button
              size="sm"
              onClick={() => handleActionClick('approved', 'Approve Design')}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleActionClick('rejected', 'Reject Design')}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject
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

        {/* Re-submit for Review & Back to Draft (approved/rejected → review or draft) */}
        {(currentStatus === 'approved' || currentStatus === 'rejected') && (
          <>
            <Button
              size="sm"
              onClick={() => handleActionClick('review', 'Re-submit for Review')}
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
                'Approve this design and mark it as finalized.'}
              {selectedAction?.status === 'review' && (
                currentStatus === 'draft'
                  ? 'Submit this design for review.'
                  : 'Re-submit this design for review.'
              )}
              {selectedAction?.status === 'rejected' &&
                'Reject this design and request changes.'}
              {selectedAction?.status === 'draft' &&
                'Move this design back to draft status.'}
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
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
