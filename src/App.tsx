import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';

function App() {
  const [currentPage, setCurrentPage] = useState<'projects' | 'workflow'>('projects');

  return (
    <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">
            {currentPage === 'projects' ? 'Projects' : 'Workflow Settings'}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {currentPage === 'projects'
              ? 'Project management for solar PV installations'
              : 'Configure workflow stages and task templates'}
          </p>
        </div>
      </div>
    </AppShell>
  );
}

export default App;
