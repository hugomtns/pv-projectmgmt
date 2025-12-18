import { Header } from '@/components/layout/Header';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectBoard } from '@/components/projects/ProjectBoard';
import { useDisplayStore } from '@/stores/displayStore';

export function Projects() {
  const view = useDisplayStore((state) => state.settings.view);

  return (
    <div className="flex h-full flex-col">
      <Header title="Projects">
        {/* Filter bar and display popover will be added in Phase 5 */}
      </Header>
      {view === 'list' ? <ProjectList /> : <ProjectBoard />}
    </div>
  );
}
