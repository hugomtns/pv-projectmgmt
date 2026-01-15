import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { AdminLogTable } from '@/components/admin-log/AdminLogTable';
import { AdminLogFilters } from '@/components/admin-log/AdminLogFilters';
import { ExportAdminLogDialog } from '@/components/admin-log/ExportAdminLogDialog';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { useAdminLogStore } from '@/stores/adminLogStore';
import { useUserStore } from '@/stores/userStore';
import { Navigate } from 'react-router-dom';

export function AdminLog() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const loadEntries = useAdminLogStore((state) => state.loadEntries);
  const currentUser = useUserStore((state) => state.currentUser);

  // Check if user is admin
  const isAdmin = currentUser?.roleId === 'role-admin';

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Admin Log" />

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <AdminLogFilters />
            <Button onClick={() => setExportDialogOpen(true)} variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
          <AdminLogTable />
        </div>
      </div>

      <ExportAdminLogDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
    </div>
  );
}
