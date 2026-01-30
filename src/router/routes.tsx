import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { Projects } from '@/pages/Projects';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import DesignDetailPage from '@/pages/DesignDetailPage';
import DocumentViewerPage from '@/pages/DocumentViewerPage';
import SiteDetailPage from '@/pages/SiteDetailPage';
import { Financials } from '@/pages/Financials';
import { FinancialModelPage } from '@/pages/FinancialModelPage';
import { ProjectFinancialOverview } from '@/pages/ProjectFinancialOverview';
import { FinancialModelEditorPage } from '@/pages/FinancialModelEditorPage';
import { LegacyFinancialRedirect } from '@/pages/LegacyFinancialRedirect';
import { Components } from '@/pages/Components';
import { WorkflowSettings } from '@/pages/WorkflowSettings';
import { Users } from '@/pages/Users';
import { Groups } from '@/pages/Groups';
import { Permissions } from '@/pages/Permissions';
import { AdminLog } from '@/pages/AdminLog';
import NotFound from '@/pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <Projects /> },
      { path: 'projects/:projectId', element: <ProjectDetailPage /> },
      { path: 'designs/:designId', element: <DesignDetailPage /> },
      { path: 'designs/:designId/financial', element: <LegacyFinancialRedirect /> },
      { path: 'documents/:documentId', element: <DocumentViewerPage /> },
      { path: 'sites/:siteId', element: <SiteDetailPage /> },
      { path: 'financials', element: <Financials /> },
      { path: 'financials/:projectId', element: <ProjectFinancialOverview /> },
      { path: 'financials/:projectId/:modelId', element: <FinancialModelEditorPage /> },
      { path: 'financials-old/:projectId', element: <FinancialModelPage /> },
      { path: 'components', element: <Components /> },
      { path: 'workflow', element: <WorkflowSettings /> },
      { path: 'users', element: <Users /> },
      { path: 'groups', element: <Groups /> },
      { path: 'permissions', element: <Permissions /> },
      { path: 'admin-log', element: <AdminLog /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
