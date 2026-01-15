import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import { router } from './router/routes'
import { initializeStores } from './lib/initializeStores'
import { LoadingScreen } from './components/layout/LoadingScreen'
import { applyStoredTheme } from './stores/themeStore'

// Apply theme immediately to prevent flash of wrong theme
applyStoredTheme()

// Initialize stores with seed data on first load
initializeStores()

function App() {
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand hydration before rendering
  useEffect(() => {
    const timer = setTimeout(() => setIsHydrated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
