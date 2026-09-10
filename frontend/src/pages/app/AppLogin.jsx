import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplicationAuth } from '../../context/ApplicationAuthContext';
import { Server } from 'lucide-react';
import { ShieldAlert } from 'lucide-react';

export default function AppLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);
  const navigate = useNavigate();
  const { login, authSettings, authError } = useApplicationAuth();
  
  const application = authSettings || {};
  const platformToken = localStorage.getItem('token');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError(null);
    try {
      await login(email, password);
      navigate(`../dashboards`);
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Login failed');
    }
  };

  if (platformToken && authError) {
    return (
      <div className="app-container flex-center">
        <div className="glass-panel w-full max-w-[420px] p-6 sm:p-10 mx-auto" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '50%' }}>
              <ShieldAlert size={48} color="#ef4444" />
            </div>
          </div>
          <h2 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            {authError}
          </p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }} 
            onClick={() => window.location.href = '/portal'}
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  if (!application.authentication_enabled) {
    return (
      <div className="app-container flex-center">
        <div className="glass-panel w-full max-w-[420px] p-6 sm:p-10 mx-auto">
          <h2>Authentication Disabled</h2>
          <p style={{ color: 'var(--text-muted)' }}>This application does not require authentication.</p>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => navigate(`/applications/${application.id}/dashboards`)}>
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container flex-center">
      <div className="glass-panel w-full max-w-[420px] p-6 sm:p-10 mx-auto">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          {application.logo_url ? (
            <img src={application.logo_url} alt="Logo" style={{ maxHeight: '64px', borderRadius: '8px' }} />
          ) : (
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '16px' }}>
              <Server size={32} color="#6366f1" />
            </div>
          )}
        </div>
        
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text)' }}>
          {application.display_name || application.name} Login
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Sign in to access protected application resources.
        </p>

        {localError && <div className="error-message" style={{ marginBottom: '1rem' }}>{localError}</div>}
        {authError && !platformToken && <div className="error-message" style={{ marginBottom: '1rem' }}>{authError}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              className="form-control" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Sign In
          </button>
        </form>

        {application.registration_enabled && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Need an account? </span>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/app/${application.slug}/register`); }} style={{ color: 'var(--primary)' }}>
              Register Here
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
