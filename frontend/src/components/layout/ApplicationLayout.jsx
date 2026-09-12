import React, { useState } from 'react';
import { NavLink, useNavigate, useParams, Link } from 'react-router-dom';
import { useApplicationAuth } from '../../context/ApplicationAuthContext';
import { 
  LogOut, ArrowLeft, Shield, Users, Server, 
  Box, Database, Search, Bell, HelpCircle, Hexagon,
  ActivitySquare, Code, Key, LayoutDashboard, Menu, X, Settings, Terminal, Activity, ChevronDown
} from 'lucide-react';
import { getPlatformApplications } from '../../api/client';

export default function ApplicationLayout({ children, appName, appLogo }) {
  const { applicationId, applicationSlug } = useParams();
  const { appUser, logout } = useApplicationAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apps, setApps] = useState([]);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);

  const basePath = applicationSlug ? `/app/${applicationSlug}` : `/applications/${applicationId}`;

  React.useEffect(() => {
    // Only try to fetch if we have a platform token
    if (localStorage.getItem('token')) {
      getPlatformApplications().then(res => {
        setApps(res.applications || []);
      }).catch(err => console.log('Could not fetch apps for switcher', err));
    }
  }, []);

  // Close mobile menu on navigate
  const handleMobileNav = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-container">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 45 }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{ backgroundColor: '#ffffff', borderRight: '1px solid var(--border-color)', zIndex: 50 }}>
        <div className="flex-between mb-2" style={{ padding: '1.25rem' }}>
          <div className="flex-align gap-3">
            {appLogo ? (
              <img src={appLogo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain' }} />
            ) : (
              <div className="ds-icon-box bg-blue-light text-blue" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                <Box size={20} strokeWidth={2} />
              </div>
            )}
            <div>
              <h2 className="font-bold text-main truncate" style={{ maxWidth: '120px', lineHeight: 1 }}>{appName || 'Application'}</h2>
              <div className="text-xs text-muted" style={{ marginTop: '2px' }}>Workspace App</div>
            </div>
          </div>
          <button className="hidden-md text-muted" onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '0 1.25rem 0.5rem' }}>
           <Link to="/workspaces" className="text-xs text-blue flex-align gap-1 font-medium hover:underline">
             <ArrowLeft size={12} /> Back to Platform
           </Link>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem' }}>
          {appUser?.loggedIn && (
            <>
              {/* OVERVIEW */}
              <div className="mb-6">
                <div className="sidebar-section-title text-muted text-xs font-bold uppercase mb-2 px-3" style={{ letterSpacing: '0.05em' }}>Overview</div>
                <NavLink to={`${basePath}/admin/overview`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
                  <Box size={18} /> Overview
                </NavLink>
              </div>

              {appUser?.role !== 'VIEWER' && (
                <>
                  {/* DEVICES */}
                  <div className="mb-6">
                    <div className="sidebar-section-title text-muted text-xs font-bold uppercase mb-2 px-3" style={{ letterSpacing: '0.05em' }}>Devices</div>
                    <NavLink to={`${basePath}/admin/devices`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
                      <Server size={18} /> Devices
                    </NavLink>
                    <NavLink to={`${basePath}/admin/device-data`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
                      <Activity size={18} /> Device Data
                    </NavLink>
                    <NavLink to={`${basePath}/admin/commands`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
                      <Terminal size={18} /> Commands
                    </NavLink>
                  </div>

                  {/* INTEGRATION */}
                  <div className="mb-6">
                    <div className="sidebar-section-title text-muted text-xs font-bold uppercase mb-2 px-3" style={{ letterSpacing: '0.05em' }}>Integration</div>
                    <NavLink to={`${basePath}/admin/security`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
                      <img src="/logo.png" style={{ width: 18, height: 18, borderRadius: 4 }} alt="" /> APIs
                    </NavLink>
                    <NavLink to={`${basePath}/admin/frontend`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
                      <Code size={18} /> Custom Application
                    </NavLink>
                  </div>

                  {/* ACCESS */}
                  <div className="mb-6">
                    <div className="sidebar-section-title text-muted text-xs font-bold uppercase mb-2 px-3" style={{ letterSpacing: '0.05em' }}>Access</div>
                    <NavLink to={`${basePath}/admin/users`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
                      <Users size={18} /> Users
                    </NavLink>
                    <NavLink to={`${basePath}/admin/permissions`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
                      <Shield size={18} /> Permissions
                    </NavLink>
                  </div>

                  {/* SETTINGS */}
                  <div className="mb-6">
                    <div className="sidebar-section-title text-muted text-xs font-bold uppercase mb-2 px-3" style={{ letterSpacing: '0.05em' }}>Settings</div>
                    <NavLink to={`${basePath}/admin/settings`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
                      <Settings size={18} /> Settings
                    </NavLink>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        
        {appUser?.loggedIn && (
          <div 
            className="flex-between text-main"
            style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: 'var(--bg-surface)' }}
            onClick={() => { logout(); navigate(`${basePath}/login`); }}
          >
            <div className="flex-align gap-2 text-sm font-medium hover:text-red transition-colors">
              <LogOut size={16} /> Logout
            </div>
          </div>
        )}
      </aside>

      <div className="app-main" style={{ backgroundColor: 'var(--bg-base)' }}>
        <header className="app-topbar" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex-1 flex-align gap-4">
            <button className="hidden-md text-main" onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <Menu size={20} />
            </button>
            <div style={{ position: 'relative' }} className="hidden-md">
              <button 
                className="flex-align gap-2 text-main font-medium ds-btn ds-btn-outline" 
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem' }}
                onClick={() => setShowAppSwitcher(!showAppSwitcher)}
              >
                {appName || 'Application'} <ChevronDown size={14} />
              </button>
              
              {showAppSwitcher && apps.length > 0 && (
                <div className="ds-card" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', width: '250px', zIndex: 100, padding: '0.5rem' }}>
                  <div className="text-xs text-muted font-bold uppercase mb-2 px-2 pt-1" style={{ letterSpacing: '0.05em' }}>Switch Application</div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {apps.map(app => (
                      <div 
                        key={app.id} 
                        className="flex-align gap-3 p-2 hover-bg-gray-50 cursor-pointer rounded"
                        onClick={() => {
                          setShowAppSwitcher(false);
                          if (app.id !== applicationId) {
                            navigate(`/app/${app.slug}/admin/overview`);
                          }
                        }}
                      >
                        <div className="ds-icon-box bg-blue-light text-blue" style={{ width: '1.5rem', height: '1.5rem', borderRadius: '4px' }}>
                          <Box size={14} />
                        </div>
                        <div className="truncate text-sm font-medium text-main">{app.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-align gap-4" style={{ marginLeft: '1rem' }}>
            <button className="text-muted hover:text-main transition-colors" style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Bell size={18} />
              <span className="ds-badge" style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: 'var(--blue)', color: 'white' }}>3</span>
            </button>
            <button className="text-muted hover:text-main transition-colors hidden-md" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <HelpCircle size={18} />
            </button>
            {appUser?.loggedIn && (
              <div className="flex-align gap-3" style={{ paddingLeft: '0.75rem', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}>
                <img src={`https://ui-avatars.com/api/?name=${appUser?.name || 'User'}&background=3b82f6&color=fff&rounded=true`} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                <div className="hidden-md" style={{ textAlign: 'left' }}>
                  <div className="font-bold text-main text-sm" style={{ lineHeight: 1 }}>{appUser?.name || 'Owner'}</div>
                  <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>{appUser?.role || 'Admin'}</div>
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
