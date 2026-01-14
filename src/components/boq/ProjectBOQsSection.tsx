import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ClipboardList,
  ExternalLink,
  Package,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { useBOQStore } from '@/stores/boqStore';
import { useDesignStore } from '@/stores/designStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { formatDistanceToNow } from 'date-fns';

import { BOQExportDialog } from './BOQExportDialog';

interface ProjectBOQsSectionProps {
  projectId: string;
}

export function ProjectBOQsSection({ projectId }: ProjectBOQsSectionProps) {
  const navigate = useNavigate();
  const [exportBOQId, setExportBOQId] = useState<string | null>(null);

  const boqStore = useBOQStore();
  const designStore = useDesignStore();
  const userStore = useUserStore();

  const projectBOQs = boqStore.getBOQsByProject(projectId);
  const projectDesigns = designStore.designs.filter((d) => d.projectId === projectId);
  const currentUser = userStore.currentUser;

  const permissions = currentUser
    ? resolvePermissions(
        currentUser,
        'boqs',
        undefined,
        userStore.permissionOverrides,
        userStore.roles
      )
    : { create: false, read: false, update: false, delete: false };

  const canUpdate = permissions.update;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getDesignForBOQ = (designId: string) => {
    return projectDesigns.find((d) => d.id === designId);
  };

  const handleNavigateToDesign = (designId: string) => {
    navigate(`/designs/${designId}?tab=boq`);
  };

  const handleExport = (boqId: string) => {
    boqStore.exportToCapex(boqId);
    setExportBOQId(null);
  };

  const exportPreview = exportBOQId
    ? boqStore.previewExportToCapex(exportBOQId)
    : null;

  // Get designs without BOQ
  const designsWithoutBOQ = projectDesigns.filter(
    (d) => !projectBOQs.some((b) => b.designId === d.id)
  );

  if (projectDesigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Designs Yet</h3>
          <p className="text-muted-foreground mb-4">
            Add designs to this project to create Bills of Quantities.
          </p>
          <Button onClick={() => navigate(`/projects/${projectId}`)}>
            Go to Project
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* BOQs Table */}
      {projectBOQs.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Design BOQs ({projectBOQs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Design</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-center">Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectBOQs.map((boq) => {
                    const design = getDesignForBOQ(boq.designId);
                    return (
                      <TableRow key={boq.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{design?.name || 'Unknown Design'}</p>
                            <p className="text-xs text-muted-foreground">{boq.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{boq.items.length}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-green-600">
                          {formatCurrency(boq.totalValue)}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(boq.updatedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleNavigateToDesign(boq.designId)}
                              className="gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExportBOQId(boq.id)}
                              disabled={!canUpdate || boq.items.length === 0}
                              className="gap-1"
                            >
                              <Upload className="h-3 w-3" />
                              Export
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Total summary */}
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Total across all BOQs:
              </span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(projectBOQs.reduce((sum, b) => sum + b.totalValue, 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Designs without BOQ */}
      {designsWithoutBOQ.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              Designs without BOQ ({designsWithoutBOQ.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {designsWithoutBOQ.map((design) => (
                <div
                  key={design.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{design.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {design.status} - Created by {design.createdBy}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigateToDesign(design.id)}
                    className="gap-2"
                  >
                    Create BOQ
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Dialog */}
      <BOQExportDialog
        open={!!exportBOQId}
        onOpenChange={(open) => !open && setExportBOQId(null)}
        preview={exportPreview}
        onExport={() => exportBOQId && handleExport(exportBOQId)}
      />
    </div>
  );
}
