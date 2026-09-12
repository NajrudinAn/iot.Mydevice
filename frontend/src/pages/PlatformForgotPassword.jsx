import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, ShieldCheck, Hexagon } from 'lucide-react';
import { platformClient } from '../api/client';

export default function PlatformForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return setError('Email is required');
    
    setLoading(true);
    setError('');
    
    try {
      const res = await platformClient.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .forgot-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          position: relative;
          overflow: hidden;
        }
        .forgot-bg-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(59,130,246,0.08) 0%, transparent 40%),
                      radial-gradient(circle at bottom left, rgba(16,185,129,0.05) 0%, transparent 40%);
          pointer-events: none;
        }
        .forgot-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(15, 23, 42, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.02) 1px, transparent 1px);
          background-size: 30px 30px;
          pointer-events: none;
        }
        .forgot-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 10px 40px -10px rgba(15, 23, 42, 0.08), 
                      0 1px 3px rgba(15, 23, 42, 0.02);
          border: 1px solid rgba(226, 232, 240, 0.8);
          z-index: 10;
          margin: 1rem;
        }
        .forgot-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%);
          border: 1px solid rgba(59,130,246,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }
        .forgot-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          text-align: center;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }
        .forgot-subtitle {
          font-size: 0.9375rem;
          color: #64748b;
          text-align: center;
          margin-bottom: 2rem;
          line-height: 1.5;
        }
        .forgot-input-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.5rem;
        }
        .forgot-input {
          width: 100%;
          padding: 0.875rem 1rem;
          font-size: 0.9375rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .forgot-input:focus {
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .forgot-btn {
          width: 100%;
          padding: 0.875rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #ffffff;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
          margin-top: 1.5rem;
        }
        .forgot-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
        }
        .forgot-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .forgot-back {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s;
          margin-top: 1.5rem;
        }
        .forgot-back:hover {
          color: #0f172a;
        }
      `}</style>

      <div className="forgot-page">
        <div className="forgot-bg-gradient" />
        <div className="forgot-grid" />
        
        <div className="forgot-card">
          {!success ? (
            <>
              <div className="forgot-icon-wrapper">
                <Mail size={28} color="#3b82f6" strokeWidth={1.5} />
              </div>
              <h2 className="forgot-title">Reset Password</h2>
              <p className="forgot-subtitle">
                Enter your email address and we'll send you a secure link to reset your password.
              </p>

              {error && (
                <div style={{
                  padding: '0.875rem',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '10px',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div>
                  <label className="forgot-input-label">Email Address</label>
                  <input
                    type="email"
                    className="forgot-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                </div>
                
                <button type="submit" className="forgot-btn" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loading ? 'Sending Link...' : 'Send Reset Link'}
                </button>
              </form>

              <div style={{ textAlign: 'center' }}>
                <Link to="/login" className="forgot-back">
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div className="forgot-icon-wrapper" style={{ 
                background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)',
                borderColor: 'rgba(16,185,129,0.2)' 
              }}>
                <ShieldCheck size={32} color="#10b981" strokeWidth={1.5} />
              </div>
              <h2 className="forgot-title" style={{ marginBottom: '1rem' }}>Check your inbox</h2>
              <p className="forgot-subtitle" style={{ marginBottom: '2rem' }}>
                We've sent a password reset link to <strong>{email}</strong>. 
                Please check your email and click the link to continue.
              </p>
              
              <Link to="/login" className="forgot-btn" style={{ textDecoration: 'none' }}>
                Return to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
