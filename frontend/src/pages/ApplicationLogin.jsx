import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { appClient } from '../api/client';
import { ShieldAlert, LogIn, UserPlus } from 'lucide-react';
import { useApplicationAuth } from '../context/ApplicationAuthContext';

export default function ApplicationLogin() {
  const { applicationId } = useParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  
  const { login, authSettings, appUser, loading } = useApplicationAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && appUser?.loggedIn) {
      navigate(`/applications/${applicationId}/dashboards`);
    }
  }, [appUser, loading, navigate, applicationId]);

  if (loading || !authSettings) {
    return <div className="app-container flex-center">Loading authentication...</div>;
  }

  // Phase 6D: If auth is not enabled, automatically proceed to dashboard
  if (!authSettings.authentication_enabled) {
    navigate(`/applications/${applicationId}/dashboards`);
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingAction(true);
    try {
      await login(email, password);
      navigate(`/applications/${applicationId}/dashboards`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="app-container flex-center">
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <div className="flex-center" style={{ marginBottom: '2rem', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Application Portal</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Sign in to access your dashboards and devices.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--accent)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <ShieldAlert size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link to={`/app/${appSlug}/forgot-password`} style={{ color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
            disabled={loadingAction}
          >
            <LogIn size={18} />
            {loadingAction ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {authSettings.registration_enabled && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
            <Link to={`/applications/${applicationId}/register`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>Create Account</Link>
          </div>
        )}
      </div>
    </div>
  );
}
