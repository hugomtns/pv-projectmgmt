import { useState, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Projects } from './pages/Projects';
import { WorkflowSettings } from './pages/WorkflowSettings';
import { Users } from './pages/Users';
import { Groups } from './pages/Groups';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Toaster } from 'sonner';

function App() {
  const [currentPage, setCurrentPage] = useState<'projects' | 'workflow' | 'users' | 'groups'>('projects');
  const [isHydrated, setIsHydrated] = useState(false);

  // Simulate brief hydration delay to show loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsHydrated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Global navigation shortcuts: G+P (go to projects), G+W (go to workflow), G+U (go to users), G+G (go to groups)
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
      {
        sequence: ['g', 'u'],
        handler: () => setCurrentPage('users'),
      },
      {
        sequence: ['g', 'g'],
        handler: () => setCurrentPage('groups'),
      },
    ],
  });

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  return (
    <>
      <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
        {currentPage === 'projects' && <Projects />}
        {currentPage === 'workflow' && <WorkflowSettings />}
        {currentPage === 'users' && <Users />}
        {currentPage === 'groups' && <Groups />}
      </AppShell>
      <Toaster position="bottom-right" richColors />
    </>
  );
}

export default App;
