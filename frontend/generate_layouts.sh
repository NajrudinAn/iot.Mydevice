#!/bin/bash

# PlatformLayout.jsx
cat << 'FILE' > src/components/layout/PlatformLayout.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutGrid, AppWindow, Settings, LogOut, Bell, Search, Activity } from 'lucide-react';
import Button from '../ui/Button';

export default function PlatformLayout({ children, sidebarLinks, activeBreadcrumb }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const defaultSidebar = [
    { label: 'Workspaces', path: '/workspaces', icon: LayoutGrid },
  ];

  const links = sidebarLinks || defaultSidebar;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="app-sidebar hidden md:flex">
        <div className="p-4 flex items-center gap-2 mb-4 border-b border-white/5">
          <Activity className="text-primary" size={24} />
          <h2 className="font-bold text-lg">IoT Platform</h2>
        </div>
        
        <nav className="flex-1 px-2">
          {links.map((link) => (
            <NavLink 
              key={link.path} 
              to={link.path}
              end={link.exact}
              className={({ isActive }) => \`sidebar-link \${isActive ? 'active' : ''}\`}
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <Button variant="ghost" className="w-full justify-start text-muted hover:text-white" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={18} className="mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <div className="flex items-center gap-4">
            <span className="text-muted font-medium hidden md:block">
              {activeBreadcrumb || 'Platform Overview'}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={16} />
              <input type="text" placeholder="Search resources..." className="form-input pl-10 py-1.5 text-sm w-64 bg-black/20 border-white/10" />
            </div>
            <button className="btn-icon">
              <Bell size={20} />
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex-center border border-primary/30 text-primary font-bold text-sm">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
FILE

# ApplicationLayout.jsx
cat << 'FILE' > src/components/layout/ApplicationLayout.jsx
import React from 'react';
import { NavLink, useNavigate, useParams, Link } from 'react-router-dom';
import { useApplicationAuth } from '../../context/ApplicationAuthContext';
import { LayoutDashboard, Settings, LogOut, ArrowLeft, Shield, Users, Server, Box, Globe, Palette } from 'lucide-react';
import Button from '../ui/Button';

export default function ApplicationLayout({ children, appName, appLogo }) {
  const { applicationId, applicationSlug } = useParams();
  const { appUser, logout, authSettings } = useApplicationAuth();
  const navigate = useNavigate();

  // If we are in the slug route
  const basePath = applicationSlug ? \`/app/\${applicationSlug}\` : \`/applications/\${applicationId}\`;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="app-sidebar hidden md:flex">
        <div className="p-4 mb-2 border-b border-white/5 flex-between">
          <div className="flex items-center gap-3">
            {appLogo ? (
              <img src={appLogo} alt="Logo" className="w-8 h-8 rounded-md object-contain bg-white/5" />
            ) : (
              <div className="w-8 h-8 rounded-md bg-primary/20 flex-center text-primary font-bold">
                {appName?.[0] || 'A'}
              </div>
            )}
            <h2 className="font-bold text-base truncate max-w-[160px]">{appName || 'Application'}</h2>
          </div>
        </div>
        
        <div className="px-4 py-2">
           <Link to="/workspaces" className="text-xs text-muted hover:text-white flex items-center gap-1 mb-4">
             <ArrowLeft size={12} /> Back to Platform
           </Link>
        </div>

        <nav className="flex-1 px-2 overflow-y-auto">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 mt-4 px-2">Overview</div>
          <NavLink to={\`\${basePath}/dashboards\`} end className={({ isActive }) => \`sidebar-link \${isActive ? 'active' : ''}\`}>
            <LayoutDashboard size={18} /> Dashboards
          </NavLink>
          
          {appUser?.loggedIn && appUser?.role !== 'VIEWER' && (
            <>
              <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 mt-6 px-2">Administration</div>
              
              <NavLink to={\`\${basePath}/admin\`} end className={({ isActive }) => \`sidebar-link \${isActive ? 'active' : ''}\`}>
                <Box size={18} /> Overview
              </NavLink>
              
              <NavLink to={\`\${basePath}/admin/devices\`} className={({ isActive }) => \`sidebar-link \${isActive ? 'active' : ''}\`}>
                <Server size={18} /> Devices & Telemetry
              </NavLink>
              
              <NavLink to={\`\${basePath}/admin/users\`} className={({ isActive }) => \`sidebar-link \${isActive ? 'active' : ''}\`}>
                <Users size={18} /> Users & Roles
              </NavLink>
              
              <NavLink to={\`\${basePath}/admin/security\`} className={({ isActive }) => \`sidebar-link \${isActive ? 'active' : ''}\`}>
                <Shield size={18} /> Authentication & APIs
              </NavLink>
              
              <NavLink to={\`\${basePath}/admin/branding\`} className={({ isActive }) => \`sidebar-link \${isActive ? 'active' : ''}\`}>
                <Palette size={18} /> Branding & Domains
              </NavLink>
            </>
          )}
        </nav>
        
        {appUser?.loggedIn && (
          <div className="p-4 border-t border-white/5">
            <Button variant="ghost" className="w-full justify-start text-muted hover:text-red-400" onClick={() => { logout(); navigate(\`\${basePath}/login\`); }}>
              <LogOut size={18} className="mr-2" /> Logout
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="app-main">
        {/* Content */}
        <main className="app-content p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
FILE

chmod +x generate_layouts.sh
./generate_layouts.sh
