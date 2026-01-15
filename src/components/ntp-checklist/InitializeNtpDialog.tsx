import { useProjectStore } from '@/stores/projectStore';
import { getItemCounts } from '@/data/ntpChecklistTemplate';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MapPin,
  FileCheck,
  Zap,
  Leaf,
  Handshake,
  DollarSign,
} from 'lucide-react';

interface InitializeNtpDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InitializeNtpDialog({
  projectId,
  open,
  onOpenChange,
}: InitializeNtpDialogProps) {
  const initializeNtpChecklist = useProjectStore((s) => s.initializeNtpChecklist);

  const { required, optional, total } = getItemCounts();

  const handleInitialize = () => {
    initializeNtpChecklist(projectId);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Initialize NTP Checklist</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This will create a standard NTP (Notice to Proceed) checklist with{' '}
              <strong>{total} items</strong> ({required} required, {optional} optional)
              organized into the following categories:
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>Site Control</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileCheck className="h-4 w-4 text-purple-500" />
                <span>Permitting</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Grid / Interconnection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Leaf className="h-4 w-4 text-green-500" />
                <span>Environmental</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Handshake className="h-4 w-4 text-orange-500" />
                <span>Commercial</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span>Financial</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              You can customize the checklist after initialization by adding, removing,
              or modifying items as needed for your project.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleInitialize}>
            Initialize Checklist
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
