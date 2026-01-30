import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MoreHorizontal,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { useDesignFinancialStore } from '@/stores/designFinancialStore';
import { useDesignStore } from '@/stores/designStore';

interface DesignFinancialComparisonProps {
  projectId: string;
  onViewDesign?: (designId: string) => void;
  onMarkWinner?: (modelId: string) => void;
}

type SortField =
  | 'name'
  | 'capacity'
  | 'equity_irr'
  | 'project_npv'
  | 'lcoe'
  | 'min_dscr'
  | 'total_capex'
  | 'total_opex';

export function DesignFinancialComparison({
  projectId,
  onViewDesign,
  onMarkWinner,
}: DesignFinancialComparisonProps) {
  const [sortField, setSortField] = useState<SortField>('equity_irr');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Memoize to prevent infinite loops
  const allModels = useDesignFinancialStore((state) => state.designFinancialModels);
  const models = useMemo(
    () => allModels.filter((m) => m.projectId === projectId),
    [allModels, projectId]
  );
  const designs = useDesignStore((state) => state.designs);

  if (models.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Financial Models</h3>
          <p className="text-muted-foreground">
            Create design financial models to compare them here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort models
  const sortedModels = [...models].sort((a, b) => {
    let aValue: number | string = 0;
    let bValue: number | string = 0;

    switch (sortField) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'capacity':
        aValue = a.capacity;
        bValue = b.capacity;
        break;
      case 'equity_irr':
        aValue = a.results?.key_metrics.equity_irr || 0;
        bValue = b.results?.key_metrics.equity_irr || 0;
        break;
      case 'project_npv':
        aValue = a.results?.key_metrics.project_npv || 0;
        bValue = b.results?.key_metrics.project_npv || 0;
        break;
      case 'lcoe':
        aValue = a.results?.key_metrics.lcoe || 0;
        bValue = b.results?.key_metrics.lcoe || 0;
        break;
      case 'min_dscr':
        aValue = a.results?.key_metrics.min_dscr || 0;
        bValue = b.results?.key_metrics.min_dscr || 0;
        break;
      case 'total_capex':
        aValue = a.capex.reduce((sum, item) => sum + item.amount, 0);
        bValue = b.capex.reduce((sum, item) => sum + item.amount, 0);
        break;
      case 'total_opex':
        aValue = a.opex.reduce((sum, item) => sum + item.amount, 0);
        bValue = b.opex.reduce((sum, item) => sum + item.amount, 0);
        break;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'lcoe' ? 'asc' : 'desc'); // Lower LCOE is better
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: value > 1000000 ? 'compact' : 'standard',
    }).format(value);
  };

  const getDesignName = (designId: string) => {
    return designs.find((d) => d.id === designId)?.name || 'Unknown Design';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Design Financial Comparison</CardTitle>
        <CardDescription>
          Compare financial metrics across {models.length} design{models.length !== 1 && 's'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  Design
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <TrendingUp className="inline ml-1 h-3 w-3" /> : <TrendingDown className="inline ml-1 h-3 w-3" />
                  )}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('capacity')}
                >
                  Capacity (MW)
                  {sortField === 'capacity' && (
                    sortDirection === 'asc' ? <TrendingUp className="inline ml-1 h-3 w-3" /> : <TrendingDown className="inline ml-1 h-3 w-3" />
                  )}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('total_capex')}
                >
                  CAPEX
                  {sortField === 'total_capex' && (
                    sortDirection === 'asc' ? <TrendingUp className="inline ml-1 h-3 w-3" /> : <TrendingDown className="inline ml-1 h-3 w-3" />
                  )}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('equity_irr')}
                >
                  Equity IRR
                  {sortField === 'equity_irr' && (
                    sortDirection === 'asc' ? <TrendingUp className="inline ml-1 h-3 w-3" /> : <TrendingDown className="inline ml-1 h-3 w-3" />
                  )}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('project_npv')}
                >
                  NPV
                  {sortField === 'project_npv' && (
                    sortDirection === 'asc' ? <TrendingUp className="inline ml-1 h-3 w-3" /> : <TrendingDown className="inline ml-1 h-3 w-3" />
                  )}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('lcoe')}
                >
                  LCOE
                  {sortField === 'lcoe' && (
                    sortDirection === 'asc' ? <TrendingUp className="inline ml-1 h-3 w-3" /> : <TrendingDown className="inline ml-1 h-3 w-3" />
                  )}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('min_dscr')}
                >
                  Min DSCR
                  {sortField === 'min_dscr' && (
                    sortDirection === 'asc' ? <TrendingUp className="inline ml-1 h-3 w-3" /> : <TrendingDown className="inline ml-1 h-3 w-3" />
                  )}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedModels.map((model) => {
                const totalCapex = model.capex.reduce((sum, item) => sum + item.amount, 0);
                const results = model.results;

                return (
                  <TableRow
                    key={model.id}
                    className={model.isWinner ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                  >
                    <TableCell>
                      {model.isWinner && (
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getDesignName(model.designId)}</p>
                        <p className="text-xs text-muted-foreground">{model.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {model.capacity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {formatCurrency(totalCapex)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {results ? (
                        <Badge variant={results.key_metrics.equity_irr > 0.12 ? 'default' : 'secondary'}>
                          {(results.key_metrics.equity_irr * 100).toFixed(2)}%
                        </Badge>
                      ) : (
                        <Minus className="inline h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {results ? (
                        <span className={results.key_metrics.project_npv > 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(results.key_metrics.project_npv)}
                        </span>
                      ) : (
                        <Minus className="inline h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {results ? (
                        `€${results.key_metrics.lcoe.toFixed(2)}`
                      ) : (
                        <Minus className="inline h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {results ? (
                        <Badge variant={results.key_metrics.min_dscr >= 1.2 ? 'default' : 'destructive'}>
                          {results.key_metrics.min_dscr.toFixed(2)}
                        </Badge>
                      ) : (
                        <Minus className="inline h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onViewDesign && (
                            <DropdownMenuItem onClick={() => onViewDesign(model.designId)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Design
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => window.open(`/designs/${model.designId}/financial`, '_blank')}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Financial Model
                          </DropdownMenuItem>
                          {!model.isWinner && onMarkWinner && (
                            <DropdownMenuItem onClick={() => onMarkWinner(model.id)}>
                              <Trophy className="mr-2 h-4 w-4" />
                              Mark as Winner
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Summary Statistics */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Designs:</p>
              <p className="font-semibold">{models.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">With Results:</p>
              <p className="font-semibold">{models.filter((m) => m.results).length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Equity IRR:</p>
              <p className="font-semibold">
                {models.filter((m) => m.results).length > 0
                  ? (
                      (models
                        .filter((m) => m.results)
                        .reduce((sum, m) => sum + (m.results?.key_metrics.equity_irr || 0), 0) /
                        models.filter((m) => m.results).length) *
                      100
                    ).toFixed(2) + '%'
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Winner:</p>
              <p className="font-semibold">{models.find((m) => m.isWinner)?.name || 'None'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
