import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Hexagon, Bell, HelpCircle } from 'lucide-react';

export default function PortalLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-container" style={{ backgroundColor: 'var(--bg-base)' }}>
      <header className="app-topbar" style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 2rem'
      }}>
        <div className="flex-1 flex-align gap-4">
          <div className="flex-align gap-2 cursor-pointer" onClick={() => navigate('/portal')}>
            <Hexagon className="text-primary" size={28} style={{ color: '#2563eb' }} strokeWidth={2.5} />
            <div>
              <div className="font-bold text-main" style={{ lineHeight: 1.1, fontSize: '1.25rem' }}>MyDevice</div>
              <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>User Portal</div>
            </div>
          </div>
        </div>

        <div className="flex-align gap-4">
          <button className="text-muted hover:text-main" style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}>
            <HelpCircle size={20} />
          </button>
          
          <div className="flex-align gap-3" style={{ paddingLeft: '1.25rem', borderLeft: '1px solid var(--border-color)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="hidden-md" style={{ textAlign: 'left', marginRight: '0.5rem' }}>
              <div className="font-bold text-main text-sm" style={{ lineHeight: 1.2 }}>{user?.name || 'User'}</div>
              <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>Workspace Owner</div>
            </div>
            <button 
              onClick={() => { logout(); navigate('/login'); }}
              className="text-muted cursor-pointer hover:text-red"
              style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ 
        flex: 1,
        overflowY: 'auto',
        height: '100vh',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '100px 2rem 2rem 2rem'
      }}>
        {children}
      </main>
    </div>
  );
}
