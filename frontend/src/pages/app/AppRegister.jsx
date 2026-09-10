import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appClient } from '../../api/client';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AppRegister({ application }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [accountExists, setAccountExists] = useState(false);
  const navigate = useNavigate();
  const { user: platformUser } = useAuth(); // Global platform user

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setAccountExists(false);

    if (password !== confirm) {
      return setError('Passwords do not match');
    }

    try {
      const res = await appClient.post(`/applications/${application.id}/auth/register`, {
        name, email, password
      });
      setSuccess(res.data.message || 'Registration successful');
    } catch (err) {
      if (err.response?.data?.code === 'ACCOUNT_EXISTS') {
        setAccountExists(true);
        setError('An account with this email already exists on the platform.');
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    }
  };

  const handleRequestAccess = async () => {
    try {
      const res = await appClient.post(
        `/applications/${application.id}/auth/request-access`, 
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSuccess(res.data.message || 'Access requested successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request access');
    }
  };

  if (!application.registration_enabled) {
    return (
      <div className="app-container flex-center">
        <div className="glass-panel w-full max-w-[420px] p-6 sm:p-10 mx-auto">
          <h2>Registration Disabled</h2>
          <p style={{ color: 'var(--text-muted)' }}>This application is not accepting new users.</p>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => navigate(`/app/${application.slug}`)}>
            Return to App
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="app-container flex-center">
        <div className="glass-panel w-full max-w-[420px] p-6 sm:p-10 mx-auto" style={{ textAlign: 'center' }}>
          <h2>Success</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{success}</p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/app/${application.slug}/login`)}>
            Proceed to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container flex-center">
      <div className="glass-panel w-full max-w-[420px] p-6 sm:p-10 mx-auto">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '16px' }}>
            <UserPlus size={32} color="#10b981" />
          </div>
        </div>
        
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text)' }}>
          Create Account
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Register to access {application.name}.
        </p>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {accountExists ? (
          <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg)', borderRadius: '8px', marginBottom: '1rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              Your email is already registered on the main platform. You must authenticate with the platform to request access.
            </p>
            {platformUser ? (
              <button onClick={handleRequestAccess} className="btn btn-primary" style={{ width: '100%' }}>
                Request Access Now
              </button>
            ) : (
              <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ width: '100%' }}>
                Go to Platform Login
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={e => setName(e.target.value)}
                required 
              />
            </div>
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
            <div className="form-group">
              <label>Confirm Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={confirm} 
                onChange={e => setConfirm(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Register
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/app/${application.slug}/login`); }} style={{ color: 'var(--primary)' }}>
            Login Here
          </a>
        </div>
      </div>
    </div>
  );
}
