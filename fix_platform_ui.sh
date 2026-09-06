#!/bin/bash

cat << 'JSX' > frontend/src/components/layout/PlatformLayout.jsx
import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, LogOut, ArrowLeft, Shield, Users, Server, 
  Box, Palette, Database, Search, Bell, HelpCircle, Hexagon, ActivitySquare, Settings, Activity
} from 'lucide-react';

export default function PlatformLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <aside className="app-sidebar">
        <div className="flex-between mb-2" style={{ padding: '1.25rem' }}>
          <div className="flex-align gap-3">
            <Hexagon className="text-primary" size={28} style={{ fill: 'rgba(59,130,246,0.2)' }} strokeWidth={2} />
            <div>
              <h2 className="font-bold text-white truncate" style={{ maxWidth: '120px', lineHeight: 1 }}>DevSync</h2>
              <div className="text-xs text-muted" style={{ marginTop: '2px' }}>IoT Platform</div>
            </div>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem' }}>
          <div className="mb-6">
            <div className="sidebar-section-title">Overview</div>
            <NavLink to="/platform" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} /> Platform Overview
            </NavLink>
          </div>
          
          <div className="mb-6">
            <div className="sidebar-section-title">Manage</div>
            <NavLink to="/workspaces" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} /> Workspaces
            </NavLink>
            <NavLink to="/platform/applications" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Box size={18} /> Applications
            </NavLink>
            <NavLink to="/platform/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Users size={18} /> Users
            </NavLink>
            <NavLink to="/platform/devices" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Server size={18} /> Devices
            </NavLink>
          </div>

          <div className="mb-6">
            <div className="sidebar-section-title">Monitor</div>
            <NavLink to="/platform/health" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <ActivitySquare size={18} /> System Health
            </NavLink>
            <NavLink to="/platform/storage" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Database size={18} /> Storage & Usage
            </NavLink>
            <NavLink to="/platform/activity" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Activity size={18} /> Activity Logs
            </NavLink>
          </div>

          <div className="mb-6">
            <div className="sidebar-section-title">Settings</div>
            <NavLink to="/platform/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Settings size={18} /> Platform Settings
            </NavLink>
            <NavLink to="/platform/integrations" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Palette size={18} /> Integrations
            </NavLink>
          </div>
        </div>
        
        <div 
          className="flex-between text-muted"
          style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', cursor: 'pointer' }}
          onClick={() => { logout(); navigate('/login'); }}
        >
          <div className="flex-align gap-2 text-sm">
            <LogOut size={16} /> Logout
          </div>
        </div>
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
            <div className="flex-align gap-3" style={{ paddingLeft: '0.75rem', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}>
              <img src={`https://ui-avatars.com/api/?name=${user?.name || 'John Doe'}&background=1f2937&color=fff&rounded=true`} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
              <div className="hidden-md" style={{ textAlign: 'left' }}>
                <div className="font-medium text-white text-sm" style={{ lineHeight: 1 }}>{user?.name || 'John Doe'}</div>
                <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>{user?.role === 'ADMIN' ? 'Platform Admin' : 'Platform User'}</div>
              </div>
            </div>
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

cat << 'JSX' > frontend/src/pages/PlatformOverview.jsx
import React, { useState } from 'react';
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

export default function PlatformOverview() {
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
          <h1 className="text-2xl font-bold mb-1">Platform Overview</h1>
          <p className="text-muted">Monitor and manage your DevSync platform infrastructure and resources.</p>
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
            <span className="text-muted font-medium text-xs">Workspaces</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold mb-2">8</div>
            <div className="text-green text-xs flex-align gap-1 font-medium"><ArrowUpRight size={14} /> 2 from last week</div>
          </div>
        </div>

        <div className="ds-card" style={{ justifyContent: 'space-between' }}>
          <div className="flex-between">
            <div className="ds-icon-box bg-green-light text-green"><Box size={20} /></div>
            <span className="text-muted font-medium text-xs">Applications</span>
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
            <h3 className="font-bold">Platform Health</h3>
            <button className="text-xs text-muted" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><Server size={16} className="text-muted" /> <span>MQTT Broker</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.98%</div>
            </div>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><Database size={16} className="text-muted" /> <span>Database</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.99%</div>
            </div>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><Activity size={16} className="text-muted" /> <span>API Gateway</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.97%</div>
            </div>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><HardDrive size={16} className="text-muted" /> <span>Storage Service</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.95%</div>
            </div>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><Shield size={16} className="text-muted" /> <span>Authentication</span></div>
              <div className="flex-align gap-1 text-green text-xs font-medium"><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)' }}></div> Operational</div>
              <div className="text-muted text-xs">99.99%</div>
            </div>
            <div className="flex-between text-sm">
              <div className="flex-align gap-3" style={{ width: '33%' }}><FileText size={16} className="text-muted" /> <span>File Storage</span></div>
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
            <h3 className="font-bold">Platform Usage</h3>
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
            <h3 className="font-bold">Top Applications</h3>
            <button className="text-xs text-muted" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>View All</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Devices</th>
                  <th>Users</th>
                  <th>Storage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="flex-align gap-2"><div className="ds-icon-box bg-green-light text-green" style={{ width: '1.5rem', height: '1.5rem' }}><Box size={12}/></div> <span className="font-medium">Factory Monitor</span></td>
                  <td>156</td>
                  <td>24</td>
                  <td className="text-muted">78.4 GB</td>
                  <td><span className="text-green text-xs">Active</span></td>
                </tr>
                <tr>
                  <td className="flex-align gap-2"><div className="ds-icon-box bg-orange-light text-orange" style={{ width: '1.5rem', height: '1.5rem' }}><Server size={12}/></div> <span className="font-medium">Energy Management</span></td>
                  <td>98</td>
                  <td>18</td>
                  <td className="text-muted">56.2 GB</td>
                  <td><span className="text-green text-xs">Active</span></td>
                </tr>
                <tr>
                  <td className="flex-align gap-2"><div className="ds-icon-box bg-blue-light text-blue" style={{ width: '1.5rem', height: '1.5rem' }}><Wifi size={12}/></div> <span className="font-medium">Asset Tracking</span></td>
                  <td>87</td>
                  <td>16</td>
                  <td className="text-muted">43.7 GB</td>
                  <td><span className="text-green text-xs">Active</span></td>
                </tr>
                <tr>
                  <td className="flex-align gap-2"><div className="ds-icon-box bg-teal-light text-teal" style={{ width: '1.5rem', height: '1.5rem' }}><Activity size={12}/></div> <span className="font-medium">Weather Station</span></td>
                  <td>64</td>
                  <td>12</td>
                  <td className="text-muted">32.1 GB</td>
                  <td><span className="text-green text-xs">Active</span></td>
                </tr>
                <tr>
                  <td className="flex-align gap-2"><div className="ds-icon-box bg-orange-light text-orange" style={{ width: '1.5rem', height: '1.5rem' }}><HardDrive size={12}/></div> <span className="font-medium">Smart Building</span></td>
                  <td>55</td>
                  <td>10</td>
                  <td className="text-muted">28.0 GB</td>
                  <td><span className="text-green text-xs">Active</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex-between text-xs text-muted mt-4" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <span>Showing 1 to 5 of 24 applications</span>
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
            <h3 className="font-bold">Recent Platform Activity</h3>
            <button className="text-xs text-muted" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>View All</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-green-light text-green" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}><PlusCircle size={16} /></div>
              <div className="w-full" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div className="text-sm font-medium" style={{ lineHeight: 1.2 }}>New application "Smart Agriculture" created</div>
                  <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>2 min ago</div>
                </div>
                <div className="text-xs text-muted mt-1">by John Doe</div>
              </div>
            </div>
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-blue-light text-blue" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}><Server size={16} /></div>
              <div className="w-full" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div className="text-sm font-medium" style={{ lineHeight: 1.2 }}>Device ESP32-1248 registered in "Factory Monitor"</div>
                  <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>8 min ago</div>
                </div>
                <div className="text-xs text-muted mt-1">by Sarah Wilson</div>
              </div>
            </div>
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-orange-light text-orange" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}><Users size={16} /></div>
              <div className="w-full" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div className="text-sm font-medium" style={{ lineHeight: 1.2 }}>New user Michael Brown joined "Energy Management"</div>
                  <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>15 min ago</div>
                </div>
                <div className="text-xs text-muted mt-1">by Admin</div>
              </div>
            </div>
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-purple-light text-purple" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}><HardDrive size={16} /></div>
              <div className="w-full" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div className="text-sm font-medium" style={{ lineHeight: 1.2 }}>Storage usage increased by 12.4%</div>
                  <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>1 hour ago</div>
                </div>
                <div className="text-xs text-muted mt-1">System</div>
              </div>
            </div>
            <div className="flex-align gap-4">
              <div className="ds-icon-box bg-red-light text-red" style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0 }}><AlertCircle size={16} /></div>
              <div className="w-full">
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div className="text-sm font-medium" style={{ lineHeight: 1.2 }}>Device NODEMCU-245 went offline</div>
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
