import React, { useState, useEffect, useRef } from 'react';
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

  const wsSwitcherRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wsSwitcherRef.current && !wsSwitcherRef.current.contains(event.target)) {
        setShowWsSwitcher(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
            <img src="/logo.png" alt="MyDevice Logo" style={{ width: 24, height: 24, borderRadius: 6 }} />
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

      <div className="app-main" style={{ backgroundColor: '#f8fafc', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(59,130,246,0.04) 0%, transparent 50%), radial-gradient(circle at bottom left, rgba(16,185,129,0.03) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.02) 1px, transparent 1px)', backgroundSize: '30px 30px', pointerEvents: 'none', zIndex: 0 }} />
        
        <header className="app-topbar" style={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)', position: 'relative', zIndex: 40 }}>
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

            <div style={{ position: 'relative' }} ref={wsSwitcherRef}>
              <button 
                className="flex-align gap-2 rounded-full text-sm font-medium transition-colors" 
                style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface-elevated)', border: '1px solid transparent', color: 'var(--text-main)', cursor: 'pointer', maxWidth: '60vw', borderRadius: '9999px' }}
                onClick={() => setShowWsSwitcher(!showWsSwitcher)}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--border-color)'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'; }}
              >
                <div className="shrink-0" style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', borderRadius: '4px' }} />
                </div>
                <span className="truncate">
                  {workspaces.find(w => w.id === workspaceId)?.name || currentWorkspace?.name || 'Workspace'} 
                </span>
                <ChevronDown size={14} className="text-muted shrink-0 ml-1" />
              </button>
              
              {showWsSwitcher && workspaces.length > 0 && (
                <div className="bg-white border border-gray-200 overflow-hidden" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', width: '280px', maxWidth: '85vw', zIndex: 100, padding: '0.5rem', borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
                  <div className="text-[11px] text-gray-500 font-bold uppercase mb-2 px-3 pt-2" style={{ letterSpacing: '0.05em' }}>Switch Workspace</div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {workspaces.map(ws => (
                      <div 
                        key={ws.id} 
                        className="flex-align gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors m-1"
                        style={{ borderRadius: '12px' }}
                        onClick={() => {
                          setShowWsSwitcher(false);
                          if (ws.id !== workspaceId) {
                            navigate(`/workspaces/${ws.id}/overview`);
                          }
                        }}
                      >
                        <div className="flex items-center justify-center shrink-0" style={{ width: '2rem', height: '2rem' }}>
                          <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', borderRadius: '8px' }} />
                        </div>
                        <div className="truncate text-sm font-bold text-gray-900">{ws.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-align gap-4" style={{ marginLeft: '1rem' }}>
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
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
                <div className="bg-white border border-gray-200 overflow-hidden" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '200px', zIndex: 100, padding: '0.5rem', borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
                  <div 
                    className="flex-align gap-2 p-3 hover:bg-red-50 cursor-pointer text-red-600 text-sm font-bold transition-colors m-1"
                    style={{ borderRadius: '12px' }}
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

        <main className="app-content px-4 md:px-12 py-6 md:py-10" style={{ position: 'relative', zIndex: 10, maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
