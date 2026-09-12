import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle, Loader2, KeyRound } from 'lucide-react';
import { platformClient } from '../api/client';

export default function PlatformResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing password reset token.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await platformClient.post('/auth/reset-password', { token, password });
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .reset-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          position: relative;
          overflow: hidden;
        }
        .reset-bg-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(59,130,246,0.08) 0%, transparent 40%),
                      radial-gradient(circle at bottom left, rgba(16,185,129,0.05) 0%, transparent 40%);
          pointer-events: none;
        }
        .reset-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(15, 23, 42, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.02) 1px, transparent 1px);
          background-size: 30px 30px;
          pointer-events: none;
        }
        .reset-card {
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
        .reset-icon-wrapper {
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
        .reset-icon-wrapper.success {
          background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%);
          border: 1px solid rgba(16,185,129,0.2);
        }
        .reset-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          text-align: center;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }
        .reset-subtitle {
          font-size: 0.9375rem;
          color: #64748b;
          text-align: center;
          margin-bottom: 2rem;
          line-height: 1.5;
        }
        .reset-input-group {
          margin-bottom: 1.25rem;
        }
        .reset-input-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.5rem;
        }
        .reset-input {
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
        .reset-input:focus {
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .reset-btn {
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
          text-decoration: none;
        }
        .reset-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
        }
        .reset-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>

      <div className="reset-page">
        <div className="reset-bg-gradient" />
        <div className="reset-grid" />
        
        <div className="reset-card">
          {!success ? (
            <>
              <div className="reset-icon-wrapper">
                <KeyRound size={28} color="#3b82f6" strokeWidth={1.5} />
              </div>
              <h2 className="reset-title">Create New Password</h2>
              <p className="reset-subtitle">
                Please enter and confirm your new password below.
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
                <div className="reset-input-group">
                  <label className="reset-input-label">New Password</label>
                  <input
                    type="password"
                    className="reset-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={!token}
                  />
                </div>

                <div className="reset-input-group">
                  <label className="reset-input-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="reset-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={!token}
                  />
                </div>
                
                <button type="submit" className="reset-btn" disabled={loading || !token}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loading ? 'Updating Password...' : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div className="reset-icon-wrapper success">
                <CheckCircle size={32} color="#10b981" strokeWidth={1.5} />
              </div>
              <h2 className="reset-title" style={{ marginBottom: '1rem' }}>Password Updated!</h2>
              <p className="reset-subtitle" style={{ marginBottom: '2rem' }}>
                Your password has been successfully changed. You can now use your new password to log in.
              </p>
              
              <Link to="/login" className="reset-btn">
                Return to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
