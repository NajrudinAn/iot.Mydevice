import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminOverview from '../components/admin/AdminOverview';
import AdminUsers from '../components/admin/AdminUsers';
import AdminDevices from '../components/admin/AdminDevices';
import AdminPermissions from '../components/admin/AdminPermissions';
import AdminDashboards from '../components/admin/AdminDashboards';
import AdminApis from '../components/admin/AdminApis';
import AdminApiKeys from '../components/admin/AdminApiKeys';
import AdminDomains from '../components/admin/AdminDomains';
import AdminDataSources from '../components/admin/AdminDataSources';
import AdminSettings from '../components/admin/AdminSettings';
import AdminHostedFrontend from '../components/admin/AdminHostedFrontend';
import PageHeader from '../components/ui/PageHeader';
import { Activity, Terminal } from 'lucide-react';

const PlaceholderView = ({ title, icon: Icon, description }) => (
  <div>
    <PageHeader title={title} icon={Icon} />
    <div className="ds-card text-center p-8 mt-6">
      <div className="text-muted mb-2 flex justify-center"><Icon size={48} strokeWidth={1} /></div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted max-w-md mx-auto">{description}</p>
    </div>
  </div>
);

export default function ApplicationAdmin() {
  return (
    <div className="space-y-6">
      <Routes>
        <Route path="/" element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<AdminOverview />} />
        
        {/* Device Management */}
        <Route path="devices" element={<AdminDevices />} />
        <Route path="device-data" element={<PlaceholderView title="Device Data" icon={Activity} description="Device data visualization and processing pipelines will be available here." />} />
        <Route path="commands" element={<PlaceholderView title="Commands" icon={Terminal} description="Send direct and scheduled commands to your devices from this interface." />} />
        <Route path="datasources" element={<AdminDataSources />} />
        
        {/* User Management */}
        <Route path="users" element={<AdminUsers />} />
        <Route path="permissions" element={<AdminPermissions />} />
        
        {/* APIs and Security */}
        <Route path="security" element={<AdminApis />} />
        <Route path="apikeys" element={<AdminApiKeys />} />
        
        {/* Settings & Branding */}
        <Route path="branding" element={<AdminDomains />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="frontend" element={<AdminHostedFrontend />} />
        
        {/* Custom Dashboards */}
        <Route path="dashboards" element={<AdminDashboards />} />
      </Routes>
    </div>
  );
}
