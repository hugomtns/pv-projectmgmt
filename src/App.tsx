import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Projects } from './pages/Projects';
import { WorkflowSettings } from './pages/WorkflowSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const [currentPage, setCurrentPage] = useState<'projects' | 'workflow'>('projects');

  // Global navigation shortcuts: G+P (go to projects), G+W (go to workflow)
  useKeyboardShortcuts({
    sequenceShortcuts: [
      {
        sequence: ['g', 'p'],
        handler: () => setCurrentPage('projects'),
      },
      {
        sequence: ['g', 'w'],
        handler: () => setCurrentPage('workflow'),
      },
    ],
  });

  return (
    <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'projects' ? <Projects /> : <WorkflowSettings />}
    </AppShell>
  );
}

export default App;
