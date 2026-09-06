import React from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { ApplicationAuthProvider, useApplicationAuth } from '../context/ApplicationAuthContext';
import ApplicationLogin from './ApplicationLogin';
import ApplicationRegister from './ApplicationRegister';
import ApplicationForgotPassword from './ApplicationForgotPassword';
import ApplicationResetPassword from './ApplicationResetPassword';
import ApplicationDashboard from './ApplicationDashboard';
import ApplicationAdmin from './ApplicationAdmin';
import DashboardBuilder from './DashboardBuilder';
import UserDevices from './UserDevices';
import DeviceDetail from './DeviceDetail';
import ApplicationLayout from '../components/layout/ApplicationLayout';
import Spinner from '../components/ui/Spinner';

const ProtectedAppRoute = ({ children }) => {
  const { appUser, loading, authSettings, authError } = useApplicationAuth();
  
  if (loading) {
    return (
      <div className="flex-column flex-center w-full h-full text-muted gap-4" style={{ minHeight: '50vh' }}>
        <Spinner size={32} />
        <span>Loading Application...</span>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex-column flex-center w-full h-full text-red-500 gap-4" style={{ minHeight: '50vh', textAlign: 'center' }}>
        <h3 className="text-xl font-bold">Application Error</h3>
        <p>{authError}</p>
      </div>
    );
  }

  if (!authSettings) {
      return (
        <div className="flex-column flex-center w-full h-full text-muted gap-4" style={{ minHeight: '50vh' }}>
            <span>Application settings not found.</span>
        </div>
      )
  }
  
  // If auth is enabled, we require login. If not, bypass.
  if (authSettings.authentication_enabled && !appUser?.loggedIn) {
    return <Navigate to="../login" replace />;
  }
  
  return children;
};

const AppLayout = () => {
  const { authSettings, appUser } = useApplicationAuth();

  return (
    <ApplicationLayout 
      appName={authSettings?.display_name} 
      appLogo={authSettings?.logo_url}
    >
      <Routes>
        <Route path="/" element={<Navigate to="dashboards" replace />} />
        
        <Route path="dashboards" element={
          <ProtectedAppRoute>
            <ApplicationDashboard />
          </ProtectedAppRoute>
        } />
        
        <Route path="dashboards/:dashboardId/view" element={
          <ProtectedAppRoute>
            <ApplicationDashboard />
          </ProtectedAppRoute>
        } />
        
        <Route path="dashboards/:dashboardId/edit" element={
          <ProtectedAppRoute>
            {appUser?.role !== 'VIEWER' ? <DashboardBuilder /> : <Navigate to="../dashboards" replace />}
          </ProtectedAppRoute>
        } />

        <Route path="devices" element={
          <ProtectedAppRoute>
            {appUser?.loggedIn ? <UserDevices /> : <Navigate to="../login" replace />}
          </ProtectedAppRoute>
        } />

        <Route path="devices/:deviceId" element={
          <ProtectedAppRoute>
            {appUser?.loggedIn ? <DeviceDetail /> : <Navigate to="../login" replace />}
          </ProtectedAppRoute>
        } />
        
        {/* We will route all /admin sub-paths to ApplicationAdmin which has its own sub-routes or tabs */}
        <Route path="admin/*" element={
          <ProtectedAppRoute>
            {appUser?.role !== 'VIEWER' ? <ApplicationAdmin /> : <Navigate to="../dashboards" replace />}
          </ProtectedAppRoute>
        } />
      </Routes>
    </ApplicationLayout>
  );
};

export default function ApplicationRouter() {
  const { applicationId } = useParams();
  
  return (
    <ApplicationAuthProvider applicationId={applicationId}>
      <Routes>
        <Route path="login" element={<ApplicationLogin />} />
        <Route path="register" element={<ApplicationRegister />} />
        <Route path="forgot-password" element={<ApplicationForgotPassword />} />
        <Route path="reset-password" element={<ApplicationResetPassword />} />
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </ApplicationAuthProvider>
  );
}
