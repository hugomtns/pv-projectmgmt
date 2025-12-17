import { Header } from '@/components/layout/Header';

export function WorkflowSettings() {
  return (
    <div className="flex h-full flex-col">
      <Header title="Workflow Settings" />
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            Configure workflow stages and task templates
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Workflow configuration UI will be implemented in Phase 9
          </p>
        </div>
      </div>
    </div>
  );
}
