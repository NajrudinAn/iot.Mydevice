import React, { useState } from 'react';
import { NavLink, useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LogOut, ArrowLeft, Shield, Users, Server, 
  Box, Database, Search, Bell, HelpCircle, Hexagon,
  ActivitySquare, Code, Key, LayoutDashboard, Menu, X, Settings, Terminal, Activity, ChevronDown, Plus
} from 'lucide-react';
import { getPlatformWorkspaces, platformClient } from '../../api/client';

export default function WorkspaceLayout({ children }) {
  const { workspaceId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop sidebar toggle
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [showWsSwitcher, setShowWsSwitcher] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isMobile = () => window.innerWidth <= 768;

  const toggleSidebar = () => {
    if (isMobile()) {
      setMobileMenuOpen(prev => !prev);
    } else {
      setSidebarOpen(prev => !prev);
    }
  };

  const basePath = `/workspaces/${workspaceId}`;

  React.useEffect(() => {
    if (localStorage.getItem('platform_token')) {
      getPlatformWorkspaces().then(res => {
        setWorkspaces(res.workspaces || []);
      }).catch(err => console.log('Could not fetch workspaces for switcher', err));

      platformClient.get(`/workspaces/${workspaceId}`).then(res => {
          setCurrentWorkspace(res.data.workspace);
      }).catch(err => console.log('Could not fetch current workspace', err));
    }
  }, [workspaceId]);

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
      <aside className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''} ${!sidebarOpen ? 'desktop-collapsed' : ''}`} style={{ backgroundColor: '#ffffff', borderRight: '1px solid var(--border-color)', zIndex: 50 }}>
        <div className="flex-between mb-2" style={{ padding: '1.25rem' }}>
          <div className="flex-align gap-2 cursor-pointer" onClick={() => navigate('/portal')}>
            <Hexagon className="text-primary" size={24} style={{ color: '#2563eb' }} strokeWidth={2.5} />
            <div>
              <div className="font-bold text-main" style={{ lineHeight: 1.1, fontSize: '1rem' }}>MyDevice</div>
              <div className="text-muted" style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>User Portal</div>
            </div>
          </div>
          <button className="mobile-only text-muted" onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '0 1.25rem 0.5rem' }}>
           <Link to="/portal" className="text-xs text-blue flex-align gap-1 font-medium hover:underline">
             <ArrowLeft size={12} /> Back to Portal
           </Link>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem' }}>
          {/* OVERVIEW */}
          <div className="mb-6">
            <div className="sidebar-section-title text-muted text-xs font-bold uppercase mb-2 px-3" style={{ letterSpacing: '0.05em' }}>Overview</div>
            <NavLink to={`${basePath}/overview`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
              <Box size={18} /> Overview
            </NavLink>
          </div>

          {/* MANAGE */}
          <div className="mb-6">
            <div className="sidebar-section-title text-muted text-xs font-bold uppercase mb-2 px-3" style={{ letterSpacing: '0.05em' }}>Manage</div>
            <NavLink to={`${basePath}/devices`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
              <Server size={18} /> Devices
            </NavLink>
            <NavLink to={`${basePath}/data`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
              <Activity size={18} /> Data
            </NavLink>
            <NavLink to={`${basePath}/commands`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
              <Terminal size={18} /> Commands
            </NavLink>
            <NavLink to={`${basePath}/apis`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
              <Code size={18} /> APIs
            </NavLink>
            <NavLink to={`${basePath}/applications`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
              <LayoutDashboard size={18} /> Applications
            </NavLink>
          </div>

          {/* ACCESS */}
          <div className="mb-6">
            <div className="sidebar-section-title text-muted text-xs font-bold uppercase mb-2 px-3" style={{ letterSpacing: '0.05em' }}>Access</div>
            <NavLink to={`${basePath}/users`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
              <Users size={18} /> Users
            </NavLink>
          </div>

          {/* SETTINGS */}
          <div className="mb-6">
            <div className="sidebar-section-title text-muted text-xs font-bold uppercase mb-2 px-3" style={{ letterSpacing: '0.05em' }}>Settings</div>
            <NavLink to={`${basePath}/settings`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleMobileNav}>
              <Settings size={18} /> Settings
            </NavLink>
          </div>
        </div>
        
        <div 
          className="flex-between text-main"
          style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: 'var(--bg-surface)' }}
          onClick={() => { logout(); navigate(`/login`); }}
        >
          <div className="flex-align gap-2 text-sm font-medium hover:text-red transition-colors">
            <LogOut size={16} /> Logout
          </div>
        </div>
      </aside>

      <div className="app-main" style={{ backgroundColor: 'var(--bg-base)' }}>
        <header className="app-topbar" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex-1 flex-align gap-4">
            {/* Hamburger — mobile only, opens the slide-in drawer */}
            <button
              className="mobile-only text-main"
              onClick={toggleSidebar}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>

            <div style={{ position: 'relative' }}>
              <button 
                className="flex-align gap-2 rounded-full text-sm font-medium transition-colors" 
                style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface-elevated)', border: '1px solid transparent', color: 'var(--text-main)', cursor: 'pointer', maxWidth: '60vw' }}
                onClick={() => setShowWsSwitcher(!showWsSwitcher)}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--border-color)'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'; }}
              >
                <div className="shrink-0" style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Hexagon size={12} style={{ color: 'white' }} />
                </div>
                <span className="truncate">
                  {workspaces.find(w => w.id === workspaceId)?.name || currentWorkspace?.name || 'Workspace'} 
                </span>
                <ChevronDown size={14} className="text-muted shrink-0 ml-1" />
              </button>
              
              {showWsSwitcher && workspaces.length > 0 && (
                <div className="ds-card shadow-lg" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', width: '280px', maxWidth: '85vw', zIndex: 100, padding: '0.5rem' }}>
                  <div className="text-xs text-muted font-bold uppercase mb-2 px-2 pt-1" style={{ letterSpacing: '0.05em' }}>Switch Workspace</div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {workspaces.map(ws => (
                      <div 
                        key={ws.id} 
                        className="flex-align gap-3 p-2 hover-bg-gray-50 cursor-pointer rounded transition-colors"
                        onClick={() => {
                          setShowWsSwitcher(false);
                          if (ws.id !== workspaceId) {
                            navigate(`/workspaces/${ws.id}/overview`);
                          }
                        }}
                      >
                        <div className="ds-icon-box bg-blue-50 text-primary shrink-0" style={{ width: '1.5rem', height: '1.5rem', borderRadius: '4px' }}>
                          <Hexagon size={14} />
                        </div>
                        <div className="truncate text-sm font-medium text-main">{ws.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-align gap-4" style={{ marginLeft: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <div 
                  className="flex-align gap-3" 
                  style={{ paddingLeft: '0.75rem', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {(user?.name || user?.email || 'U').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden-md" style={{ textAlign: 'left' }}>
                  <div className="font-bold text-main text-sm" style={{ lineHeight: 1 }}>{user?.name || user?.email?.split('@')[0] || 'User'}</div>
                  <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>Workspace Owner</div>
                  </div>
              </div>

              {showProfileMenu && (
                <div className="ds-card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '200px', zIndex: 100, padding: '0.5rem' }}>
                  <div 
                    className="flex-align gap-2 p-2 hover-bg-gray-50 cursor-pointer rounded text-red text-sm font-medium"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      navigate('/login');
                    }}
                  >
                    <LogOut size={16} /> Logout
                  </div>
                </div>
              )}
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
