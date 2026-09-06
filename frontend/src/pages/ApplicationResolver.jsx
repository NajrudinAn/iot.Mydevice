import React, { useEffect, useState } from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { externalClient } from '../api/client';
import { ApplicationAuthProvider, useApplicationAuth } from '../context/ApplicationAuthContext';
import AppLogin from './app/AppLogin';
import AppRegister from './app/AppRegister';
import DashboardsList from './DashboardsList';
import ApplicationAdmin from './ApplicationAdmin';
import DashboardView from './DashboardView';
import DashboardBuilder from './DashboardBuilder';
import AppLanding from './app/AppLanding';
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
  
  // For application resolver, the public route is the AppLanding, so dashboards require login if auth enabled
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
        <Route path="/" element={<AppLanding />} />
        
        <Route path="dashboards" element={
          <ProtectedAppRoute>
            <DashboardsList />
          </ProtectedAppRoute>
        } />
        
        <Route path="dashboards/:dashboardId/view" element={
          <ProtectedAppRoute>
            <DashboardView />
          </ProtectedAppRoute>
        } />
        
        <Route path="dashboards/:dashboardId/edit" element={
          <ProtectedAppRoute>
            <DashboardBuilder />
          </ProtectedAppRoute>
        } />
        
        <Route path="admin/*" element={
          <ProtectedAppRoute>
            {appUser?.role !== 'VIEWER' ? <ApplicationAdmin /> : <Navigate to="../dashboards" replace />}
          </ProtectedAppRoute>
        } />
      </Routes>
    </ApplicationLayout>
  );
};

export default function ApplicationResolver() {
  const { applicationSlug } = useParams();
  const [resolvedAppId, setResolvedAppId] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const resolveApp = async () => {
      try {
        const res = await externalClient.get(`/applications/slug/${applicationSlug}`);
        setResolvedAppId(res.data.application.id);
      } catch (err) {
        console.error(err);
        setError('Application not found');
      }
    };
    resolveApp();
  }, [applicationSlug]);

  if (error) return <div className="app-container flex-center text-red-500">{error}</div>;
  if (!resolvedAppId) return <div className="app-container flex-center"><Spinner size={32} /></div>;

  return (
    <ApplicationAuthProvider applicationId={resolvedAppId}>
      <Routes>
        <Route path="login" element={<AppLogin />} />
        <Route path="register" element={<AppRegister />} />
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </ApplicationAuthProvider>
  );
}
