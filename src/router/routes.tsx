import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { Projects } from '@/pages/Projects';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import { WorkflowSettings } from '@/pages/WorkflowSettings';
import { Users } from '@/pages/Users';
import { Groups } from '@/pages/Groups';
import { Permissions } from '@/pages/Permissions';
import NotFound from '@/pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <Projects /> },
      { path: 'projects/:projectId', element: <ProjectDetailPage /> },
      { path: 'workflow', element: <WorkflowSettings /> },
      { path: 'users', element: <Users /> },
      { path: 'groups', element: <Groups /> },
      { path: 'permissions', element: <Permissions /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
