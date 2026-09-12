import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, UserPlus, Hexagon, Server, Loader2, ArrowLeft } from 'lucide-react';
import { platformClient } from '../api/client';

export default function PlatformRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await platformClient.post('/auth/register', { name, email, password });
      // Successful registration, navigate to login
      navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
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
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: '3rem 2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Top Glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', opacity: 0.5 }}></div>
        
        <Link to="/login" style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }} className="hover:text-primary transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="flex-center" style={{ flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem', marginTop: '1rem' }}>
          <img src="/logo.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em', marginBottom: '0.25rem' }}>Create Account</h1>
            <p className="text-muted text-sm">Join the MyDevice Platform</p>
          </div>
        </div>

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
            <label className="text-sm font-medium text-muted block mb-2">
              Full Name
            </label>
            <input
              type="text"
              className="ds-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              required
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.75rem 1rem', fontSize: '0.9375rem', transition: 'border-color var(--transition-fast)' }}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted block mb-2">
              Email Address
            </label>
            <input
              type="email"
              className="ds-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.75rem 1rem', fontSize: '0.9375rem', transition: 'border-color var(--transition-fast)' }}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted block mb-2">
              Password
            </label>
            <input
              type="password"
              className="ds-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              minLength={6}
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
            {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <span className="text-muted">Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }} className="hover:underline">
            Log in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
