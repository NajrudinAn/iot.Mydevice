import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { platformClient } from '../api/client';
import Button from '../components/ui/Button';

export default function ApplicationForgotPassword() {
  const { appSlug } = useParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  // We need to resolve the appSlug to appId first to call the API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return setError('Email is required');
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Resolve slug to ID
      const resolveRes = await platformClient.get(`/applications/slug/${appSlug}`);
      if (!resolveRes.data.application) {
        throw new Error('Application not found');
      }
      const appId = resolveRes.data.application.id;

      // 2. Request forgot password
      const res = await platformClient.post(`/applications/${appId}/auth/forgot-password`, { email });
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8">
        
        <div className="flex-center mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex-center text-blue-600 mb-4">
            <Mail size={24} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Forgot Password</h2>
        <p className="text-center text-slate-500 mb-8 text-[14px]">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-[13px] mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg text-[14px] mb-6 border border-green-200">
              If an account with that email exists, a password reset link has been sent. Please check your inbox.
            </div>
            <Link to={`/app/${appSlug}/login`}>
              <Button variant="secondary" className="w-full">Return to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[14px]"
                placeholder="you@example.com"
                required
              />
            </div>

            <Button type="submit" variant="primary" className="w-full h-11" loading={loading}>
              Send Reset Link
            </Button>
            
            <div className="text-center pt-2">
              <Link to={`/app/${appSlug}/login`} className="text-[13px] text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
