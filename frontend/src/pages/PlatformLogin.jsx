import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, Hexagon, Server, Loader2 } from 'lucide-react';
import { platformClient } from '../api/client';

export default function PlatformLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      
      if (loggedInUser.is_platform_admin) {
        navigate('/platform');
      } else {
        // Not a platform admin - they are a regular user. Route them to their user portal.
        navigate('/portal');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed. Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.05), transparent 40%)',
      padding: '1.5rem'
    }}>
      <div className="glass-panel relative overflow-hidden w-full max-w-[440px] p-6 sm:p-10">
        {/* Decorative Top Glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', opacity: 0.5 }}></div>
        
        <div className="flex-center" style={{ flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '64px', height: '64px', 
            borderRadius: 'var(--radius-lg)', 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.05))',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Hexagon size={32} color="var(--primary)" strokeWidth={1.5} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em', marginBottom: '0.25rem' }}>MyDevice Login</h1>
            <p className="text-muted text-sm">Sign in to manage your workspaces or devices</p>
          </div>
        </div>

        {message && !error && (
          <div style={{ 
            padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', 
            color: 'var(--green)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', 
            gap: '0.75rem', marginBottom: '1.5rem' 
          }}>
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div style={{ 
            padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', 
            color: 'var(--red)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', 
            gap: '0.75rem', marginBottom: '2rem' 
          }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="text-sm font-medium text-muted block mb-2" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Email Address</span>
            </label>
            <input
              type="email"
              className="ds-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@mydevice.internal"
              required
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.75rem 1rem', fontSize: '0.9375rem', transition: 'border-color var(--transition-fast)' }}
            />
          </div>
          
          <div>
            <div className="flex-between mb-2">
              <label className="text-sm font-medium text-muted block">
                Password
              </label>
              <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }} className="hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              className="ds-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.75rem 1rem', fontSize: '0.9375rem', transition: 'border-color var(--transition-fast)' }}
            />
          </div>
          
          <button 
            type="submit" 
            className="ds-btn"
            style={{ 
              width: '100%', marginTop: '1rem', padding: '0.875rem',
              display: 'flex', justifyContent: 'center', gap: '0.75rem',
              fontSize: '1rem', fontWeight: 600,
              boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.25)'
            }}
            disabled={loading}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Server size={18} />}
            {loading ? 'Signing you in...' : 'Enter Control Center'}
          </button>
        </form>
        
        <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <span className="text-muted">Don't have an account? </span>
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }} className="hover:underline">
            Sign up now
          </Link>
        </div>
      </div>
    </div>
  );
}
