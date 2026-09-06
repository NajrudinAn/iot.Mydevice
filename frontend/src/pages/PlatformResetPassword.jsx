import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle } from 'lucide-react';
import { platformClient } from '../api/client';
import Button from '../components/ui/Button';

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

  if (!token && !error) {
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8">
        
        <div className="flex-center mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex-center text-blue-600 mb-4">
            {success ? <CheckCircle size={24} className="text-green-600" /> : <Lock size={24} />}
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          {success ? 'Password Reset Complete' : 'Reset Password'}
        </h2>
        
        {!success && (
          <p className="text-center text-slate-500 mb-8 text-[14px]">
            Please enter your new password below.
          </p>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-[13px] mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg text-[14px] mb-6 border border-green-200">
              Your password has been successfully reset. You can now log in with your new password.
            </div>
            <Link to="/login">
              <Button variant="primary" className="w-full">Proceed to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[14px]"
                placeholder="••••••••"
                required
                disabled={!token}
              />
            </div>
            
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[14px]"
                placeholder="••••••••"
                required
                disabled={!token}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full h-11" loading={loading} disabled={!token}>
              Reset Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
