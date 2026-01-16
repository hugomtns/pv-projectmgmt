import { useState } from 'react';
import { useInspectionStore } from '@/stores/inspectionStore';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { PenLine, CheckCircle, User } from 'lucide-react';
import {
  INSPECTION_SIGNATURE_ROLE_LABELS,
  type InspectorSignature,
} from '@/lib/types/inspection';
import type { Inspection } from '@/lib/types/inspection';

interface SignaturePanelProps {
  inspection: Inspection;
  disabled?: boolean;
}

const SIGNATURE_ROLES: InspectorSignature['role'][] = [
  'inspector',
  'witness',
  'owner_representative',
];

export function SignaturePanel({ inspection, disabled }: SignaturePanelProps) {
  const [selectedRole, setSelectedRole] = useState<InspectorSignature['role']>('inspector');
  const [isAdding, setIsAdding] = useState(false);

  const addSignature = useInspectionStore((state) => state.addSignature);
  const currentUser = useUserStore((state) => state.currentUser);

  const handleAddSignature = () => {
    addSignature(inspection.id, selectedRole);
    setIsAdding(false);
  };

  // Check if current user already signed with selected role
  const hasSignedAsRole = (role: InspectorSignature['role']) => {
    return inspection.signatures.some(
      (s) => s.signedById === currentUser?.id && s.role === role
    );
  };

  return (
    <div className="space-y-4">
      <Label>Signatures ({inspection.signatures.length})</Label>

      {/* Existing signatures */}
      {inspection.signatures.length > 0 && (
        <div className="space-y-2">
          {inspection.signatures.map((signature) => (
            <div
              key={signature.id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{signature.signedBy}</p>
                <p className="text-xs text-muted-foreground">
                  {INSPECTION_SIGNATURE_ROLE_LABELS[signature.role]} · {format(new Date(signature.signedAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add signature form */}
      {!disabled && (
        <>
          {!isAdding ? (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setIsAdding(true)}
            >
              <PenLine className="w-4 h-4" />
              Add Signature
            </Button>
          ) : (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {currentUser?.firstName} {currentUser?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Signing as current user
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => setSelectedRole(v as InspectorSignature['role'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNATURE_ROLES.map((role) => (
                      <SelectItem
                        key={role}
                        value={role}
                        disabled={hasSignedAsRole(role)}
                      >
                        {INSPECTION_SIGNATURE_ROLE_LABELS[role]}
                        {hasSignedAsRole(role) && ' (already signed)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                By signing, you confirm that the inspection has been conducted
                according to standard procedures.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleAddSignature}
                  disabled={hasSignedAsRole(selectedRole)}
                >
                  <PenLine className="w-4 h-4" />
                  Sign
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {inspection.signatures.length === 0 && disabled && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No signatures yet
        </p>
      )}
    </div>
  );
}
