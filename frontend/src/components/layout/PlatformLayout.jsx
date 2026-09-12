import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, LogOut, ArrowLeft, Shield, Users, Server, 
  Box, Palette, Database, Search, Bell, HelpCircle, Hexagon, ActivitySquare, Settings, Activity, Menu, X
} from 'lucide-react';

export default function PlatformLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const closeSidebar = () => setIsSidebarOpen(false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(prev => !prev);
    } else {
      setDesktopSidebarOpen(prev => !prev);
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30 }}
          onClick={closeSidebar}
        />
      )}
      
      <aside className={`app-sidebar ${isSidebarOpen ? 'mobile-open' : ''} ${!desktopSidebarOpen ? 'desktop-collapsed' : ''}`}>
        <div className="flex-align gap-3 mb-2" style={{ padding: '1.5rem' }}>
          <div className="flex-align gap-3 cursor-pointer" onClick={() => navigate('/portal')}>
            <img src="/logo.png" alt="MyDevice Logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <div>
              <h2 className="font-bold text-main truncate" style={{ maxWidth: '120px', lineHeight: 1.1, color: 'var(--text-main)', fontSize: '1.25rem' }}>MyDevice</h2>
              <div className="text-muted" style={{ marginTop: '2px', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>IoT Platform</div>
            </div>
          </div>
          {isSidebarOpen && (
            <button className="mobile-only" onClick={closeSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          )}
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
              <LayoutDashboard size={18} /> Workspaces & Apps
            </NavLink>
            <NavLink to="/platform-users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Users size={18} /> Platform Users
            </NavLink>
          </div>
        </div>
        
        <div 
          className="flex-align gap-2 text-muted"
          style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 500 }}
          onClick={() => { logout(); navigate('/login'); }}
        >
          <LogOut size={18} style={{ transform: 'rotate(180deg)' }} /> <span style={{ marginLeft: '4px' }}>Logout</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="flex-1 flex-align gap-4">
            <button 
              className="mobile-only"
              onClick={toggleSidebar}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <div style={{ position: 'relative', width: '100%', maxWidth: '36rem' }} className="hidden-md">
              <Search style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
              <input 
                type="text" 
                placeholder="Search workspaces, apps, devices..." 
                className="ds-input"
              />
              <div style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600 }} className="text-muted text-xs">⌘K</div>
            </div>
          </div>
          
          {/* Mobile Logo Centered */}
          <div className="mobile-only flex-align gap-2" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <img src="/logo.png" alt="MyDevice Logo" style={{ width: 24, height: 24, borderRadius: 6 }} />
            <div style={{ textAlign: 'left' }}>
              <div className="font-bold text-main" style={{ lineHeight: 1.1, fontSize: '1rem' }}>MyDevice</div>
              <div className="text-muted" style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>IoT Platform</div>
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
            <div className="flex-align gap-3" style={{ paddingLeft: '1.25rem', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'JD'}
              </div>
              <div className="hidden-md" style={{ textAlign: 'left', marginRight: '0.5rem' }}>
                <div className="font-bold text-main text-sm" style={{ lineHeight: 1.2 }}>{user?.name || 'John Doe'}</div>
                <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>Platform Owner</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted hidden-md"><path d="m6 9 6 6 6-6"/></svg>
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
