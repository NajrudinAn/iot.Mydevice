import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PlatformLogin from './pages/PlatformLogin';
import PlatformRegister from './pages/PlatformRegister';
import PlatformForgotPassword from './pages/PlatformForgotPassword';
import PlatformResetPassword from './pages/PlatformResetPassword';
import PlatformOverview from './pages/PlatformOverview';
import PlatformUsers from './pages/PlatformUsers';
import PlatformApplicationInspection from './pages/PlatformApplicationInspection';
import PlatformWorkspaces from './pages/PlatformWorkspaces';
import ApplicationsList from './pages/ApplicationsList';
import ApplicationResolver from './pages/ApplicationResolver';

import HostResolver from './pages/HostResolver';
import PlatformLayout from './components/layout/PlatformLayout';
import PortalLayout from './components/layout/PortalLayout';
import WorkspaceLayout from './components/layout/WorkspaceLayout';
import WorkspaceOverview from './pages/WorkspaceOverview';
import WorkspaceDevices from './pages/WorkspaceDevices';
import WorkspaceDeviceDetails from './pages/WorkspaceDeviceDetails';
import WorkspaceData from './pages/WorkspaceData';
import WorkspaceDataDeviceView from './pages/WorkspaceDataDeviceView';
import WorkspaceCommands from './pages/WorkspaceCommands';
import WorkspaceSettings from './pages/WorkspaceSettings';
import WorkspaceUsers from './pages/WorkspaceUsers';
import Spinner from './components/ui/Spinner';
import UserPortal from './pages/UserPortal';
import WorkspaceApis from './pages/WorkspaceApis';
import WorkspaceApiDetails from './pages/WorkspaceApiDetails';

const ProtectedPlatformRoute = ({ children, breadcrumb }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="app-container flex-center">
        <div className="flex-column flex-center gap-4 text-muted">
          <Spinner size={32} />
          <span>Authenticating...</span>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (!user.is_platform_admin) return <Navigate to="/portal" replace />;
  
  return (
    <PlatformLayout activeBreadcrumb={breadcrumb}>
      {children}
    </PlatformLayout>
  );
};

const ProtectedPortalRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="app-container flex-center">
        <div className="flex-column flex-center gap-4 text-muted">
          <Spinner size={32} />
          <span>Authenticating...</span>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.is_platform_admin) return <Navigate to="/platform" replace />;
  
  return (
    <PortalLayout>
      {children}
    </PortalLayout>
  );
};

const ProtectedWorkspaceRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="app-container flex-center">
        <Spinner size={32} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_platform_admin) return <Navigate to="/platform" replace />;
  
  // Whether admin or user, inside a workspace context we use WorkspaceLayout
  return (
    <WorkspaceLayout>
      {children}
    </WorkspaceLayout>
  );
};

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return user.is_platform_admin ? <Navigate to="/platform" replace /> : <Navigate to="/portal" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <HostResolver>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<PlatformLogin />} />
            <Route path="/register" element={<PlatformRegister />} />
            <Route path="/forgot-password" element={<PlatformForgotPassword />} />
            <Route path="/reset-password" element={<PlatformResetPassword />} />
            
            <Route 
              path="/platform" 
              element={
                <ProtectedPlatformRoute breadcrumb="Overview">
                  <PlatformOverview />
                </ProtectedPlatformRoute>
              } 
            />

            <Route 
              path="/workspaces" 
              element={
                <ProtectedPlatformRoute breadcrumb="Workspaces & Applications">
                  <PlatformWorkspaces />
                </ProtectedPlatformRoute>
              } 
            />

            <Route 
              path="/platform-users" 
              element={
                <ProtectedPlatformRoute breadcrumb="Platform Users">
                  <PlatformUsers />
                </ProtectedPlatformRoute>
              } 
            />

            <Route 
              path="/workspaces/:workspaceId/overview" 
              element={
                <ProtectedWorkspaceRoute>
                  <WorkspaceOverview />
                </ProtectedWorkspaceRoute>
              } 
            />

            {/* Other minimal workspace routes redirect to overview or blank for now */}
            <Route path="/workspaces/:workspaceId/devices" element={<ProtectedWorkspaceRoute><WorkspaceDevices /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/devices/:deviceId" element={<ProtectedWorkspaceRoute><WorkspaceDeviceDetails /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/data" element={<ProtectedWorkspaceRoute><WorkspaceData /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/commands" element={<ProtectedWorkspaceRoute><WorkspaceCommands /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/commands/:deviceId" element={<ProtectedWorkspaceRoute><WorkspaceCommands /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/data/:deviceId" element={<ProtectedWorkspaceRoute><WorkspaceDataDeviceView /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/data/:deviceId/source/:sourceId" element={<ProtectedWorkspaceRoute><WorkspaceDataDeviceView /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/apis" element={<ProtectedWorkspaceRoute><WorkspaceApis /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/apis/:apiId" element={<ProtectedWorkspaceRoute><WorkspaceApiDetails /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/applications" element={<ProtectedWorkspaceRoute><ApplicationsList /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/users" element={<ProtectedWorkspaceRoute><WorkspaceUsers /></ProtectedWorkspaceRoute>} />
            <Route path="/workspaces/:workspaceId/settings" element={<ProtectedWorkspaceRoute><WorkspaceSettings /></ProtectedWorkspaceRoute>} />
            <Route 
              path="/workspaces/:workspaceId/applications/:applicationId" 
              element={
                <ProtectedWorkspaceRoute>
                  <PlatformApplicationInspection />
                </ProtectedWorkspaceRoute>
              } 
            />
            <Route path="/portal" element={
              <ProtectedPortalRoute>
                <UserPortal />
              </ProtectedPortalRoute>
            } />
            
            <Route path="/app/:applicationSlug/*" element={<ApplicationResolver />} />
          </Routes>
        </HostResolver>
      </BrowserRouter>
    </AuthProvider>
  );
}
