import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useFinancialStore } from '@/stores/financialStore';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calculator, Plus, ArrowRight } from 'lucide-react';

export function Financials() {
  const financialModels = useFinancialStore((state) => state.financialModels);
  const projects = useProjectStore((state) => state.projects);

  // Combine projects with their financial model status
  const projectsData = projects.map((project) => {
    const model = financialModels.find((m) => m.projectId === project.id);
    return { project, model };
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Financial Models">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Calculator className="h-4 w-4" />
          <span>Manage financial analysis for your projects</span>
        </div>
      </Header>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {projects.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a project first to add financial analysis.
              </p>
              <Button asChild>
                <Link to="/projects">Go to Projects</Link>
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Project</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>PPA Price</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectsData.map(({ project, model }) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              model ? 'bg-primary/10' : 'bg-muted'
                            }`}
                          >
                            <DollarSign
                              className={`h-4 w-4 ${
                                model ? 'text-primary' : 'text-muted-foreground'
                              }`}
                            />
                          </div>
                          <span>{project.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.location}
                      </TableCell>
                      <TableCell>
                        {model ? (
                          <Badge variant="default" className="bg-green-600">
                            Model Created
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No Model</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {model ? (
                          <span>{model.inputs.capacity} MW</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {model ? (
                          <span>{model.inputs.ppa_price} /MWh</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/financials/${project.id}`}>
                            {model ? (
                              <>
                                View
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Create
                              </>
                            )}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
