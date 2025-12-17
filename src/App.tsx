import { AppShell } from './components/layout/AppShell';

function App() {
  return (
    <AppShell>
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">PV Project Workflow</h1>
          <p className="mt-4 text-muted-foreground">
            Project management prototype for solar PV installations
          </p>
        </div>
      </div>
    </AppShell>
  );
}

export default App;
