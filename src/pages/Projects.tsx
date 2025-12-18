import { Header } from '@/components/layout/Header';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectBoard } from '@/components/projects/ProjectBoard';
import { DisplayPopover } from '@/components/projects/DisplayPopover';
import { FilterBar } from '@/components/projects/FilterBar';
import { SearchInput } from '@/components/projects/SearchInput';
import { ActiveFilters } from '@/components/projects/ActiveFilters';
import { useDisplayStore } from '@/stores/displayStore';

export function Projects() {
  const view = useDisplayStore((state) => state.settings.view);

  return (
    <div className="flex h-full flex-col">
      <Header title="Projects">
        <div className="flex gap-2 flex-1 max-w-2xl">
          <SearchInput />
          <FilterBar />
          <DisplayPopover />
        </div>
      </Header>
      <ActiveFilters />
      {view === 'list' ? <ProjectList /> : <ProjectBoard />}
    </div>
  );
}
