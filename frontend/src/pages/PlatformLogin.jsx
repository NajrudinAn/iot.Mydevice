import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, Hexagon, Server, Loader2, Eye, EyeOff, Wifi, Cpu, BarChart3, Shield, ArrowRight } from 'lucide-react';
import { platformClient } from '../api/client';

export default function PlatformLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  
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
        navigate('/portal');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed. Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Wifi, label: 'Real-time MQTT', desc: 'Live device telemetry' },
    { icon: Cpu, label: 'Device Management', desc: 'Full lifecycle control' },
    { icon: BarChart3, label: 'Analytics', desc: 'Custom dashboards' },
    { icon: Shield, label: 'Secure', desc: 'End-to-end encryption' },
  ];

  return (
    <>
      <style>{`
        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #f8fafc;
        }
        @media (max-width: 900px) {
          .login-page { grid-template-columns: 1fr; }
          .login-brand-panel { display: none !important; }
        }
        .login-brand-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 4rem;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          overflow: hidden;
        }
        .login-brand-panel::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -30%;
          width: 100%;
          height: 200%;
          background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        .login-brand-panel::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -20%;
          width: 80%;
          height: 100%;
          background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 60%);
          pointer-events: none;
        }
        .login-grid-bg {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .login-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #ffffff;
        }
        .login-form-inner {
          width: 100%;
          max-width: 400px;
        }
        .login-input-group {
          position: relative;
          margin-bottom: 1.25rem;
        }
        .login-input-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          letter-spacing: -0.01em;
        }
        .login-input {
          width: 100%;
          padding: 0.8125rem 1rem;
          font-size: 0.9375rem;
          font-family: 'Inter', sans-serif;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          background: #f9fafb;
          color: #111827;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .login-input::placeholder {
          color: #9ca3af;
        }
        .login-submit {
          width: 100%;
          padding: 0.875rem;
          font-size: 0.9375rem;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          color: #ffffff;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);
          margin-top: 0.5rem;
        }
        .login-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
          transform: translateY(-1px);
        }
        .login-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .login-feature-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          backdrop-filter: blur(4px);
          transition: all 0.3s ease;
        }
        .login-feature-card:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.12);
          transform: translateX(4px);
        }
        .login-feature-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .login-pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          display: flex;
          transition: color 0.2s;
        }
        .login-pw-toggle:hover {
          color: #6b7280;
        }
        .login-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.75rem 0;
          color: #9ca3af;
          font-size: 0.8125rem;
        }
        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        .login-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }
        .login-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }
        @keyframes float-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .login-dot {
          position: absolute;
          border-radius: 50%;
          background: rgba(59,130,246,0.3);
          animation: float-pulse 4s ease-in-out infinite;
        }
      `}</style>

      <div className="login-page">
        {/* Left Panel — Brand / Features */}
        <div className="login-brand-panel">
          <div className="login-grid-bg" />
          
          {/* Floating decorative dots */}
          <div className="login-dot" style={{ width: 8, height: 8, top: '15%', right: '20%', animationDelay: '0s' }} />
          <div className="login-dot" style={{ width: 6, height: 6, top: '40%', right: '10%', animationDelay: '1s' }} />
          <div className="login-dot" style={{ width: 10, height: 10, bottom: '25%', right: '30%', animationDelay: '2s' }} />
          <div className="login-dot" style={{ width: 5, height: 5, top: '60%', left: '8%', animationDelay: '0.5s', background: 'rgba(16,185,129,0.3)' }} />
          <div className="login-dot" style={{ width: 7, height: 7, bottom: '15%', left: '25%', animationDelay: '1.5s', background: 'rgba(16,185,129,0.3)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Logo + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '3rem' }}>
              <img src="/logo.png" alt="Logo" style={{ width: 48, height: 48, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
              <div>
                <h2 style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.2 }}>MyDevice</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', margin: 0, marginTop: 2 }}>IoT Control Platform</p>
              </div>
            </div>

            {/* Tagline */}
            <h1 style={{
              color: '#ffffff',
              fontSize: '2.25rem',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
            }}>
              Connect, Monitor<br />
              & Control Your<br />
              <span style={{ background: 'linear-gradient(135deg, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                IoT Devices
              </span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '380px' }}>
              A complete platform for device management, real-time telemetry, and custom dashboards — all powered by MQTT.
            </p>

            {/* Feature Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {features.map((f, i) => (
                <div key={i} className="login-feature-card">
                  <div className="login-feature-icon" style={{
                    background: i % 2 === 0
                      ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.05))'
                      : 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
                  }}>
                    <f.icon size={20} color={i % 2 === 0 ? '#60a5fa' : '#34d399'} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div style={{ color: '#ffffff', fontSize: '0.8125rem', fontWeight: 600 }}>{f.label}</div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginTop: 2 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel — Login Form */}
        <div className="login-form-panel">
          <div className="login-form-inner">
            {/* Mobile-only logo */}
            <div style={{ display: 'none', marginBottom: '2rem', textAlign: 'center' }} className="login-mobile-logo">
              <style>{`@media (max-width: 900px) { .login-mobile-logo { display: block !important; } }`}</style>
                <img src="/logo.png" alt="Logo" style={{ width: 48, height: 48, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>MyDevice</h2>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Welcome back</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9375rem', lineHeight: 1.5, margin: 0 }}>Sign in to manage your workspaces and devices</p>
            </div>

            {/* Success Message */}
            {message && !error && (
              <div style={{
                padding: '0.875rem 1rem',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '10px',
                color: '#059669',
                fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                marginBottom: '1.5rem'
              }}>
                <Shield size={16} style={{ flexShrink: 0 }} />
                <span>{message}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                padding: '0.875rem 1rem',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '10px',
                color: '#dc2626',
                fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                marginBottom: '1.5rem'
              }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="login-input-group">
                <label className="login-input-label">Email Address</label>
                <input
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="login-input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="login-input-label" style={{ marginBottom: 0 }}>Password</label>
                  <Link to="/forgot-password" className="login-link" style={{ fontSize: '0.8125rem' }}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    className="login-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                {loading ? 'Signing in...' : 'Sign in to Control Center'}
              </button>
            </form>

            {/* Register Link */}
            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
              <span style={{ color: '#6b7280' }}>Don't have an account? </span>
              <Link to="/register" className="login-link">
                Create account
              </Link>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
                Secured with TLS encryption · MQTT v3.1.1
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
