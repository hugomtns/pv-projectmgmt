import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Projects } from './pages/Projects';
import { WorkflowSettings } from './pages/WorkflowSettings';

function App() {
  const [currentPage, setCurrentPage] = useState<'projects' | 'workflow'>('projects');

  return (
    <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'projects' ? <Projects /> : <WorkflowSettings />}
    </AppShell>
  );
}

export default App;
