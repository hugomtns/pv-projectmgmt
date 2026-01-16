import { useWorkOrderStore } from '@/stores/workOrderStore';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WorkOrderSignature } from '@/lib/types/workOrder';
import { WORK_ORDER_SIGNATURE_ROLE_LABELS } from '@/lib/types/workOrder';
import { PenLine, Check, User } from 'lucide-react';

interface WorkOrderSignaturePanelProps {
  workOrderId: string;
  signatures: WorkOrderSignature[];
}

const SIGNATURE_ROLES: WorkOrderSignature['role'][] = [
  'technician',
  'supervisor',
  'owner_representative',
];

export function WorkOrderSignaturePanel({
  workOrderId,
  signatures,
}: WorkOrderSignaturePanelProps) {
  const addSignature = useWorkOrderStore((state) => state.addSignature);
  const currentUser = useUserStore((state) => state.currentUser);

  const handleSign = (role: WorkOrderSignature['role']) => {
    addSignature(workOrderId, role);
  };

  // Get signature for each role
  const getSignatureForRole = (role: WorkOrderSignature['role']) => {
    return signatures.find((s) => s.role === role);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <PenLine className="h-4 w-4" />
        Signatures
      </h4>

      <div className="space-y-2">
        {SIGNATURE_ROLES.map((role) => {
          const signature = getSignatureForRole(role);

          return (
            <div
              key={role}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    signature ? 'bg-green-500/10' : 'bg-muted'
                  }`}
                >
                  {signature ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {WORK_ORDER_SIGNATURE_ROLE_LABELS[role]}
                  </p>
                  {signature ? (
                    <p className="text-xs text-muted-foreground">
                      {signature.signedBy} - {new Date(signature.signedAt).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not signed</p>
                  )}
                </div>
              </div>

              {!signature && currentUser && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSign(role)}
                  className="gap-1"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Sign
                </Button>
              )}

              {signature && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Signed
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {signatures.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          At least one signature is required to complete the work order
        </p>
      )}
    </div>
  );
}
