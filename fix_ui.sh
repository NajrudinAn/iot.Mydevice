#!/bin/bash

# We will create a robust index.css that defines all the layout classes needed for the DevSync UI
cat << 'CSS' > frontend/src/index.css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  /* Color Palette - Deep Dark Mode */
  --bg-base: #0b0f19;
  --bg-surface: #131825;
  --bg-surface-elevated: #1f2937;
  
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --primary-transparent: rgba(59, 130, 246, 0.15);
  
  --secondary: #10b981;
  --secondary-hover: #059669;

  --accent: #ef4444;
  --warning: #f59e0b;
  --purple: #8b5cf6;
  --teal: #14b8a6;
  --orange: #f59e0b;
  --blue: #3b82f6;
  --green: #10b981;
  --red: #ef4444;
  --pink: #ec4899;
  
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  
  --border-color: rgba(255, 255, 255, 0.05);
  
  /* Glassmorphism */
  --glass-bg: rgba(19, 24, 37, 0.7);
  --glass-border: rgba(255, 255, 255, 0.05);
  --glass-blur: blur(12px);
  
  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
  --shadow-glow: 0 0 10px rgba(59, 130, 246, 0.3);

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-base);
  color: var(--text-main);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a {
  color: inherit;
  text-decoration: none;
}

/* Layout */
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-size: 0.875rem;
}

.app-sidebar {
  width: 260px;
  background-color: var(--bg-base);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 20;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-base);
  min-width: 0;
}

.app-topbar {
  height: 64px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-base);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  z-index: 10;
}

.app-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* Utilities */
.flex-center { display: flex; align-items: center; justify-content: center; }
.flex-between { display: flex; align-items: center; justify-content: space-between; }
.flex-align { display: flex; align-items: center; }
.text-muted { color: var(--text-muted); }
.text-white { color: var(--text-main); }
.font-medium { font-weight: 500; }
.font-bold { font-weight: 700; }
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-lg { font-size: 1.125rem; }
.text-2xl { font-size: 1.5rem; }
.text-3xl { font-size: 1.875rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.w-full { width: 100%; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Grid System */
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.col-span-2 { grid-column: span 2 / span 2; }
.col-span-3 { grid-column: span 3 / span 3; }

@media (min-width: 768px) {
  .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .md\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .md\:col-span-1 { grid-column: span 1 / span 1; }
  .md\:col-span-2 { grid-column: span 2 / span 2; }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 768px) {
  .hidden-md { display: none; }
  .grid-cols-6 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* Sidebar Elements */
.sidebar-section-title {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
  padding: 0 0.75rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  color: var(--text-muted);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  font-weight: 500;
  margin-bottom: 0.25rem;
  text-decoration: none;
}

.sidebar-link:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-main);
}

.sidebar-link.active {
  background-color: var(--primary);
  color: white;
  box-shadow: var(--shadow-glow);
}

/* Components */
.ds-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
}

.ds-icon-box {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ds-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  font-size: 0.625rem;
  font-weight: 700;
  height: 1rem;
  width: 1rem;
}

/* Colors for specific elements */
.text-blue { color: var(--blue); }
.bg-blue-light { background-color: rgba(59, 130, 246, 0.2); }
.text-green { color: var(--green); }
.bg-green-light { background-color: rgba(16, 185, 129, 0.2); }
.text-purple { color: var(--purple); }
.bg-purple-light { background-color: rgba(139, 92, 246, 0.2); }
.text-orange { color: var(--orange); }
.bg-orange-light { background-color: rgba(245, 158, 11, 0.2); }
.text-teal { color: var(--teal); }
.bg-teal-light { background-color: rgba(20, 184, 166, 0.2); }
.text-red { color: var(--red); }
.bg-red-light { background-color: rgba(239, 68, 68, 0.2); }
.text-pink { color: var(--pink); }
.bg-pink-light { background-color: rgba(236, 72, 153, 0.2); }

/* Buttons & Inputs */
.ds-btn {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all var(--transition-fast);
}
.ds-btn:hover { background-color: var(--primary-hover); }

.ds-select {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  border-radius: var(--radius-md);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  outline: none;
}

.ds-input {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  border-radius: var(--radius-md);
  padding: 0.375rem 2.5rem 0.375rem 2.5rem;
  width: 100%;
  outline: none;
}
.ds-input:focus { border-color: rgba(59, 130, 246, 0.5); }

/* Tables */
.ds-table {
  width: 100%;
  border-collapse: collapse;
}
.ds-table th {
  text-align: left;
  padding-bottom: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-color);
}
.ds-table td {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.875rem;
}
.ds-table tr:last-child td { border-bottom: none; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
CSS

cat << 'JSX' > frontend/src/components/layout/ApplicationLayout.jsx
import React from 'react';
import { NavLink, useNavigate, useParams, Link } from 'react-router-dom';
import { useApplicationAuth } from '../../context/ApplicationAuthContext';
import { 
  LayoutDashboard, LogOut, ArrowLeft, Shield, Users, Server, 
  Box, Palette, Database, Search, Bell, HelpCircle, Hexagon, ChevronLeft, ActivitySquare
} from 'lucide-react';

export default function ApplicationLayout({ children, appName, appLogo }) {
  const { applicationId, applicationSlug } = useParams();
  const { appUser, logout } = useApplicationAuth();
  const navigate = useNavigate();

  const basePath = applicationSlug ? `/app/${applicationSlug}` : `/applications/${applicationId}`;

  return (
    <div className="app-container">
      <aside className="app-sidebar">
        <div className="flex-between mb-2" style={{ padding: '1.25rem' }}>
          <div className="flex-align gap-3">
            {appLogo ? (
              <img src={appLogo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain' }} />
            ) : (
              <Hexagon className="text-primary" size={28} style={{ fill: 'rgba(59,130,246,0.2)' }} strokeWidth={2} />
            )}
            <div>
              <h2 className="font-bold text-white truncate" style={{ maxWidth: '120px', lineHeight: 1 }}>{appName || 'Application'}</h2>
              <div className="text-xs text-muted" style={{ marginTop: '2px' }}>IoT Platform</div>
            </div>
          </div>
        </div>
        
        <div style={{ padding: '0 1.25rem 0.5rem' }}>
           <Link to="/workspaces" className="text-xs text-muted flex-align gap-1">
             <ArrowLeft size={12} /> Back to Platform
           </Link>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem' }}>
          <div className="mb-6">
            <div className="sidebar-section-title">Application</div>
            <NavLink to={`${basePath}/dashboards`} end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} /> Dashboards
            </NavLink>
            {appUser?.loggedIn && (
              <NavLink to={`${basePath}/devices`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <ActivitySquare size={18} /> Devices & Telemetry
              </NavLink>
            )}
          </div>
          
          {appUser?.loggedIn && appUser?.role === 'ADMIN' && (
            <div className="mb-6">
              <div className="sidebar-section-title">Administration</div>
              
              <NavLink to={`${basePath}/admin/overview`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Box size={18} /> Overview
              </NavLink>
              
              <NavLink to={`${basePath}/admin/devices`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Server size={18} /> Manage Devices
              </NavLink>

              <NavLink to={`${basePath}/admin/datasources`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Database size={18} /> Data Sources
              </NavLink>
              
              <NavLink to={`${basePath}/admin/users`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Users size={18} /> Users & Permissions
              </NavLink>
              
              <NavLink to={`${basePath}/admin/security`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Shield size={18} /> APIs & Keys
              </NavLink>
              
              <NavLink to={`${basePath}/admin/branding`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Palette size={18} /> Branding & Settings
              </NavLink>
            </div>
          )}
        </div>
        
        {appUser?.loggedIn && (
          <div 
            className="flex-between text-muted"
            style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', cursor: 'pointer' }}
            onClick={() => { logout(); navigate(`${basePath}/login`); }}
          >
            <div className="flex-align gap-2 text-sm">
              <LogOut size={16} /> Logout
            </div>
          </div>
        )}
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="flex-1 flex-align">
            <div style={{ position: 'relative', width: '100%', maxWidth: '32rem' }} className="hidden-md">
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
              <input 
                type="text" 
                placeholder="Search workspaces, applications, users, devices..." 
                className="ds-input"
              />
              <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.2)' }} className="text-muted text-xs border border-white/10 rounded px-1.5">⌘K</div>
            </div>
          </div>
          
          <div className="flex-align gap-4" style={{ marginLeft: '1rem' }}>
            <button className="text-muted" style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Bell size={18} />
              <span className="ds-badge" style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: 'var(--blue)', color: 'white' }}>12</span>
            </button>
            <button className="text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <HelpCircle size={18} />
            </button>
            {appUser?.loggedIn && (
              <div className="flex-align gap-3" style={{ paddingLeft: '0.75rem', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}>
                <img src={`https://ui-avatars.com/api/?name=${appUser?.name || 'User'}&background=1f2937&color=fff&rounded=true`} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                <div className="hidden-md" style={{ textAlign: 'left' }}>
                  <div className="font-medium text-white text-sm" style={{ lineHeight: 1 }}>{appUser?.name || 'User'}</div>
                  <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>{appUser?.role === 'ADMIN' ? 'App Admin' : 'App User'}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
JSX

cat << 'JSX' > frontend/src/components/admin/AdminOverview.jsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApplicationAuth } from '../../context/ApplicationAuthContext';
import { 
  LayoutGrid, Box, Server, Users, Wifi, HardDrive, 
  Download, ArrowUpRight, Database, 
  Activity, FileText, PlusCircle, AlertCircle
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, Title, Tooltip, Legend, ArcElement, BarElement, Filler 
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, ArcElement, BarElement, Filler
);

const ChartConfig = {
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1f2937',
      titleColor: '#f8fafc',
      bodyColor: '#94a3b8',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
    }
  },
  scales: {
    x: { grid: { display: false, drawBorder: false }, ticks: { color: '#64748b', font: { size: 10 } } },
    y: { grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: '#64748b', font: { size: 10 }, padding: 10 } }
  },
  maintainAspectRatio: false,
  responsive: true,
};

export default function AdminOverview() {
  const { applicationId } = useParams();
  const { appUser } = useApplicationAuth();
  const [dateRange, setDateRange] = useState('May 10 - May 16, 2025');

  const deviceConnectivityData = {
    labels: ['May 10', 'May 11', 'May 12', 'May 13', 'May 14', 'May 15', 'May 16'],
    datasets: [
      { label: 'Online', data: [800, 850, 900, 880, 840, 920, 842], borderColor: '#10b981', backgroundColor: '#10b981', tension: 0.4, borderWidth: 2, pointRadius: 3 },
      { label: 'Offline', data: [180, 200, 190, 250, 220, 180, 200], borderColor: '#ef4444', backgroundColor: '#ef4444', tension: 0.4, borderWidth: 2, pointRadius: 3 },
      { label: 'Unknown', data: [50, 60, 40, 70, 50, 40, 60], borderColor: '#3b82f6', backgroundColor: '#3b82f6', tension: 0.4, borderWidth: 2, pointRadius: 3 }
    ]
  };

  const storageUsageData = {
    labels: ['Telemetry Data', 'File Storage', 'Database'],
    datasets: [{ data: [312.8, 128.6, 71.0], backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b'], borderWidth: 0, cutout: '75%' }]
  };

  const platformUsageData = {
    labels: ['May 10', 'May 11', 'May 12', 'May 13', 'May 14', 'May 15', 'May 16'],
    datasets: [
      { label: 'Telemetry (GB)', data: [40, 60, 80, 90, 100, 110, 98.7], backgroundColor: '#3b82f6', borderRadius: 4, barPercentage: 0.6 },
      { label: 'API Requests (K)', data: [50, 70, 90, 100, 110, 120, 124], backgroundColor: '#8b5cf6', borderRadius: 4, barPercentage: 0.6 }
    ]
  };

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Application Overview</h1>
          <p className="text-muted">Monitor and manage your application infrastructure and resources.</p>
        </div>
        <div className="flex-align gap-3">
          <select className="ds-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option>May 10 - May 16, 2025</option>
            <option>Last 30 Days</option>
          </select>
          <button className="ds-btn"><Download size={16} /> Export Report</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
        <div className="ds-card" style={{ justifyContent: 'space-between' }}>
          <div className="flex-between">
            <div className="ds-icon-box bg-blue-light text-blue"><LayoutGrid size={20} /></div>
            <span className="text-muted font-medium text-xs">Dashboards</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold mb-2">8</div>
            <div className="text-green text-xs flex-align gap-1 font-medium"><ArrowUpRight size={14} /> 2 from last week</div>
          </div>
        </div>

        <div className="ds-card" style={{ justifyContent: 'space-between' }}>
          <div className="flex-between">
            <div className="ds-icon-box bg-green-light text-green"><Box size={20} /></div>
            <span className="text-muted font-medium text-xs">Custom Domains</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold mb-2">24</div>
            <div className="text-green text-xs flex-align gap-1 font-medium"><ArrowUpRight size={14} /> 5 from last week</div>
          </div>
        </div>

        <div className="ds-card" style={{ justifyContent: 'space-between' }}>
          <div className="flex-between">
            <div className="ds-icon-box bg-purple-light text-purple"><Users size={20} /></div>
            <span className="text-muted font-medium text-xs">Users</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold mb-2">156</div>
            <div className="text-green text-xs flex-align gap-1 font-medium"><ArrowUpRight size={14} /> 18 from last week</div>
          </div>
        </div>

        <div className="ds-card" style={{ justifyContent: 'space-between' }}>
          <div className="flex-between">
            <div className="ds-icon-box bg-orange-light text-orange"><Server size={20} /></div>
            <span className="text-muted font-medium text-xs">Devices</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold mb-2">1,248</div>
            <div className="text-green text-xs flex-align gap-1 font-medium"><ArrowUpRight size={14} /> 96 from last week</div>
          </div>
        </div>

        <div className="ds-card" style={{ justifyContent: 'space-between' }}>
          <div className="flex-between">
            <div className="ds-icon-box bg-teal-light text-teal"><Wifi size={20} /></div>
            <span className="text-muted font-medium text-xs">Online Devices</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold mb-2">842</div>
            <div className="text-green text-xs flex-align gap-1 font-medium"><ArrowUpRight size={14} /> 76 from last week</div>
          </div>
        </div>

        <div className="ds-card" style={{ justifyContent: 'space-between' }}>
          <div className="flex-between">
            <div className="ds-icon-box bg-pink-light text-pink"><Database size={20} /></div>
            <span className="text-muted font-medium text-xs">Storage Used</span>
          </div>
          <div className="mt-4">
            <div className="flex-align gap-1 mb-2">
              <span className="text-3xl font-bold">512.4</span>
              <span className="font-medium">GB</span>
            </div>
            <div className="text-green text-xs flex-align gap-1 font-medium"><ArrowUpRight size={14} /> 12.4% from last week</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="ds-card md:col-span-1 lg:col-span-1" style={{ minHeight: '300px' }}>
          <div className="flex-between mb-4">
            <h3 className="font-bold">Device Connectivity</h3>
            <select className="ds-select" style={{ background: 'transparent' }}><option>Last 7 Days</option></select>
          </div>
          <div className="flex-align gap-4 mb-4 text-xs font-medium">
            <div className="flex-align gap-1"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> <span>Online</span></div>
            <div className="flex-align gap-1"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--red)' }}></div> <span>Offline</span></div>
            <div className="flex-align gap-1"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--blue)' }}></div> <span>Unknown</span></div>
          </div>
          <div style={{ height: '192px' }}>
            <Line data={deviceConnectivityData} options={ChartConfig} />
          </div>
        </div>

        <div className="ds-card md:col-span-1 lg:col-span-1">
          <div className="flex-between mb-4">
            <h3 className="font-bold">Application Health</h3>
            <button className="text-xs text-muted" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><Server size={16} className="text-muted" /> <span>MQTT Connection</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.98%</div>
            </div>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><Database size={16} className="text-muted" /> <span>Data Storage</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.99%</div>
            </div>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><Activity size={16} className="text-muted" /> <span>API Endpoints</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.97%</div>
            </div>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><HardDrive size={16} className="text-muted" /> <span>File Service</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.95%</div>
            </div>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><Wifi size={16} className="text-muted" /> <span>Authentication</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.99%</div>
            </div>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><FileText size={16} className="text-muted" /> <span>Logs</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.96%</div>
            </div>
          </div>
        </div>

        <div className="ds-card md:col-span-1 lg:col-span-1">
          <div className="flex-between mb-4">
            <h3 className="font-bold">Storage Usage</h3>
            <button className="text-xs text-muted" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>View Details</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '128px', height: '128px', position: 'relative', marginBottom: '1.5rem' }}>
              <Doughnut data={storageUsageData} options={{ ...ChartConfig, plugins: { tooltip: { enabled: true } } }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span className="text-lg font-bold mb-1" style={{ lineHeight: 1 }}>512.4 GB</span>
                <span className="text-muted" style={{ fontSize: '10px' }}>Total Used</span>
              </div>
            </div>
            <div className="w-full text-xs" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="flex-between">
                <div className="flex-align gap-2"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--blue)' }}></div> <span className="text-muted">Telemetry Data</span></div>
                <div className="flex-align gap-4"><span>312.8 GB</span> <span className="text-muted" style={{ width: '32px', textAlign: 'right' }}>61.1%</span></div>
              </div>
              <div className="flex-between">
                <div className="flex-align gap-2"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--purple)' }}></div> <span className="text-muted">File Storage</span></div>
                <div className="flex-align gap-4"><span>128.6 GB</span> <span className="text-muted" style={{ width: '32px', textAlign: 'right' }}>25.1%</span></div>
              </div>
              <div className="flex-between">
                <div className="flex-align gap-2"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--orange)' }}></div> <span className="text-muted">Database</span></div>
                <div className="flex-align gap-4"><span>71.0 GB</span> <span className="text-muted" style={{ width: '32px', textAlign: 'right' }}>13.8%</span></div>
              </div>
            </div>
            <div className="w-full mt-4 flex-between text-xs" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <span className="text-muted">Total Capacity: 2 TB</span>
              <span className="text-blue">25.1% Used</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="ds-card lg:col-span-1">
          <div className="flex-between mb-4">
            <h3 className="font-bold">Application Usage</h3>
            <select className="ds-select" style={{ background: 'transparent' }}><option>Last 7 Days</option></select>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <div className="text-muted text-xs mb-1">Telemetry Ingested</div>
              <div className="text-2xl font-bold mb-1">98.7 <span className="text-sm font-medium text-muted">GB</span></div>
              <div className="text-green text-xs flex-align gap-1 font-medium"><ArrowUpRight size={14} /> 22.6%</div>
            </div>
            <div>
              <div className="text-muted text-xs mb-1">API Requests</div>
              <div className="text-2xl font-bold mb-1">1.24 <span className="text-sm font-medium text-muted">M</span></div>
              <div className="text-green text-xs flex-align gap-1 font-medium"><ArrowUpRight size={14} /> 15.3%</div>
            </div>
          </div>

          <div className="flex-align gap-4 mb-4 text-xs font-medium">
            <div className="flex-align gap-1"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--blue)' }}></div> <span>Telemetry (GB)</span></div>
            <div className="flex-align gap-1"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--purple)' }}></div> <span>API Requests (K)</span></div>
          </div>
          
          <div style={{ flex: 1, minHeight: '150px' }}>
             <Bar data={platformUsageData} options={{ ...ChartConfig, plugins: { ...ChartConfig.plugins, legend: { display: false } } }} />
          </div>
        </div>

        <div className="ds-card lg:col-span-1">
          <div className="flex-between mb-4">
            <h3 className="font-bold">Top Devices</h3>
            <button className="text-xs text-muted" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>View All</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>Messages</th>
                  <th>Ping</th>
                  <th>Storage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="flex-align gap-2"><div className="ds-icon-box bg-green-light text-green" style={{ width: '1.5rem', height: '1.5rem' }}><Server size={12}/></div> <span className="font-medium">ESP32-TempSensor</span></td>
                  <td>156k</td>
                  <td>24ms</td>
                  <td className="text-muted">78.4 MB</td>
                  <td><span className="text-green text-xs">Online</span></td>
                </tr>
                <tr>
                  <td className="flex-align gap-2"><div className="ds-icon-box bg-orange-light text-orange" style={{ width: '1.5rem', height: '1.5rem' }}><Server size={12}/></div> <span className="font-medium">NodeMCU-Relay</span></td>
                  <td>98k</td>
                  <td>18ms</td>
                  <td className="text-muted">56.2 MB</td>
                  <td><span className="text-green text-xs">Online</span></td>
                </tr>
                <tr>
                  <td className="flex-align gap-2"><div className="ds-icon-box bg-blue-light text-blue" style={{ width: '1.5rem', height: '1.5rem' }}><Server size={12}/></div> <span className="font-medium">RaspberryPi-Hub</span></td>
                  <td>87k</td>
                  <td>16ms</td>
                  <td className="text-muted">43.7 MB</td>
                  <td><span className="text-green text-xs">Online</span></td>
                </tr>
                <tr>
                  <td className="flex-align gap-2"><div className="ds-icon-box bg-teal-light text-teal" style={{ width: '1.5rem', height: '1.5rem' }}><Server size={12}/></div> <span className="font-medium">Weather-Station</span></td>
                  <td>64k</td>
                  <td>12ms</td>
                  <td className="text-muted">32.1 MB</td>
                  <td><span className="text-green text-xs">Online</span></td>
                </tr>
                <tr>
                  <td className="flex-align gap-2"><div className="ds-icon-box bg-orange-light text-orange" style={{ width: '1.5rem', height: '1.5rem' }}><Server size={12}/></div> <span className="font-medium">Smart-Meter-01</span></td>
                  <td>55k</td>
                  <td>10ms</td>
                  <td className="text-muted">28.0 MB</td>
                  <td><span className="text-green text-xs">Online</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex-between text-xs text-muted mt-4" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <span>Showing 1 to 5 of 1,248 devices</span>
            <div className="flex-align gap-2">
              <button style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>&lt;</button>
              <button style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>1</button>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>2</button>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>3</button>
              <button style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>&gt;</button>
            </div>
          </div>
        </div>

        <div className="ds-card lg:col-span-1">
          <div className="flex-between mb-4">
            <h3 className="font-bold">Recent App Activity</h3>
            <button className="text-xs text-muted" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>View All</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-green-light text-green" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}><PlusCircle size={16} /></div>
              <div className="w-full" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div className="text-sm font-medium" style={{ lineHeight: 1.2 }}>New Dashboard "Main Monitor" created</div>
                  <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>2 min ago</div>
                </div>
                <div className="text-xs text-muted mt-1">by John Doe</div>
              </div>
            </div>
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-blue-light text-blue" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}><Server size={16} /></div>
              <div className="w-full" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div className="text-sm font-medium" style={{ lineHeight: 1.2 }}>Device ESP32-TempSensor registered</div>
                  <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>8 min ago</div>
                </div>
                <div className="text-xs text-muted mt-1">by Sarah Wilson</div>
              </div>
            </div>
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-orange-light text-orange" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}><Users size={16} /></div>
              <div className="w-full" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div className="text-sm font-medium" style={{ lineHeight: 1.2 }}>New user Michael Brown joined</div>
                  <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>15 min ago</div>
                </div>
                <div className="text-xs text-muted mt-1">by Admin</div>
              </div>
            </div>
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-purple-light text-purple" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}><HardDrive size={16} /></div>
              <div className="w-full" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div className="text-sm font-medium" style={{ lineHeight: 1.2 }}>Data retention policy updated</div>
                  <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>1 hour ago</div>
                </div>
                <div className="text-xs text-muted mt-1">System</div>
              </div>
            </div>
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-red-light text-red" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}><AlertCircle size={16} /></div>
              <div className="w-full">
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div className="text-sm font-medium" style={{ lineHeight: 1.2 }}>Device NODEMCU-Relay went offline</div>
                  <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>2 hours ago</div>
                </div>
                <div className="text-xs text-muted mt-1">System</div>
              </div>
            </div>
          </div>
          <div className="flex-between text-xs text-primary mt-4" style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', cursor: 'pointer' }}>
            View all activity logs <ArrowUpRight size={14} style={{ transform: 'rotate(45deg)' }} />
          </div>
        </div>
      </div>
      
      <div className="text-center text-muted text-xs mt-6 mb-2">
        © 2025 DevSync IoT Platform. All rights reserved.
      </div>
    </div>
  );
}
JSX
