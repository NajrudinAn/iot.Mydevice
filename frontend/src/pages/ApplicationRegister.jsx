import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { appClient } from '../api/client';
import { ShieldAlert, LogIn, UserPlus, CheckCircle } from 'lucide-react';
import { useApplicationAuth } from '../context/ApplicationAuthContext';

export default function ApplicationRegister() {
  const { applicationId } = useParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  
  const { authSettings, appUser, loading } = useApplicationAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && appUser?.loggedIn) {
      navigate(`/applications/${applicationId}/dashboards`);
    }
  }, [appUser, loading, navigate, applicationId]);

  if (loading || !authSettings) {
    return <div className="app-container flex-center">Loading authentication...</div>;
  }

  if (!authSettings.authentication_enabled || !authSettings.registration_enabled) {
    return (
      <div className="app-container flex-center flex-column gap-4 text-center p-8">
        <ShieldAlert size={48} className="text-red-500" />
        <h2>Registration Disabled</h2>
        <p className="text-muted">This application does not accept public registrations.</p>
        <Link to={`/applications/${applicationId}/login`} className="btn btn-primary">Return to Login</Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoadingAction(true);
    try {
      const res = await appClient.post(`/applications/${applicationId}/auth/register`, { name, email, password });
      setSuccessMsg(res.data.message || 'Registration successful!');
    } catch (err) {
      if (err.response?.data?.code === 'ACCOUNT_EXISTS') {
        setError('An account with this email already exists on the platform. Please log in first, then request access.');
      } else {
        setError(err.response?.data?.message || 'Registration failed.');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="app-container flex-center">
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <div className="flex-center" style={{ marginBottom: '2rem', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Create Account</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Register to access {authSettings.display_name || 'this application'}.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--accent)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <ShieldAlert size={16} />
            {error}
          </div>
        )}

        {successMsg ? (
          <div className="text-center py-6">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h3 className="mb-2 text-green-500">Success!</h3>
            <p className="text-sm text-muted mb-6">{successMsg}</p>
            <Link to={`/applications/${applicationId}/login`} className="btn btn-primary w-full block text-center">
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
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
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
              disabled={loadingAction}
            >
              <UserPlus size={18} />
              {loadingAction ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
          <Link to={`/applications/${applicationId}/login`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
