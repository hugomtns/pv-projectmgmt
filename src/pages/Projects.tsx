import { Header } from '@/components/layout/Header';
import { ProjectList } from '@/components/projects/ProjectList';

export function Projects() {
  return (
    <div className="flex h-full flex-col">
      <Header title="Projects">
        {/* Filter bar and display popover will be added in Phase 5 */}
      </Header>
      <ProjectList />
    </div>
  );
}
