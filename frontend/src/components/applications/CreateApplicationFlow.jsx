import React, { useState, useEffect } from 'react';
import { X, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';
import { platformClient } from '../../api/client';

export default function CreateApplicationFlow({ workspaceId, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    authentication_api_id: '',
    api_access_ids: [],
    deployment_mode: 'DEVELOPMENT',
    registration_enabled: false
  });
  
  const [authType, setAuthType] = useState('');

  // Data
  const [availableApis, setAvailableApis] = useState([]);

  useEffect(() => {
    fetchApis();
  }, [workspaceId]);

  const fetchApis = async () => {
    try {
      const res = await platformClient.get(`/workspaces/${workspaceId}/api-management/apis`);
      if (res.data.success) {
        setAvailableApis(res.data.apis);
      }
    } catch (err) {
      console.error('Failed to fetch APIs', err);
    }
  };

  const authApis = availableApis.filter(api => api.auth_mode === 'APPLICATION_SESSION');
  const accessApis = availableApis;

  const handleNext = () => {
    if (step === 1 && !formData.name) return;
    if (step === 2) {
        if (!authType) return;
        if (authType === 'LOGIN' && !formData.authentication_api_id) return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Map 'STATIC' or 'PUBLIC' to null for the backend
      const payload = {
        ...formData,
        authentication_api_id: authType === 'LOGIN' ? formData.authentication_api_id : null
      };
      const res = await platformClient.post(`/workspaces/${workspaceId}/applications`, payload);
      onSuccess(res.data.application);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create application');
      setLoading(false);
    }
  };

  const toggleApiAccess = (apiId) => {
    setFormData(prev => {
      const exists = prev.api_access_ids.includes(apiId);
      if (exists) {
        return { ...prev, api_access_ids: prev.api_access_ids.filter(id => id !== apiId) };
      } else {
        return { ...prev, api_access_ids: [...prev.api_access_ids, apiId] };
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create Application (Step {step} of 4)</h2>
          <Button variant="icon" icon={X} onClick={onClose} />
        </div>
        
        <div className="modal-body">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-[13px] font-medium">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-bold text-main">Basic Information</h3>
              <p className="text-muted text-[13px] mb-4">Set up the foundation for your hosted frontend application.</p>
              
              <div className="form-group">
                <label className="form-label">Application Name <span className="text-red">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Farm Monitor Dashboard"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-bold text-main">Application Authentication</h3>
              <p className="text-muted text-[13px] mb-4">How will this application authenticate with the platform?</p>
              
              <div className="grid grid-cols-1 gap-3 mb-6">
                <div 
                  onClick={() => setAuthType('LOGIN')}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${authType === 'LOGIN' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div className="flex-between mb-1">
                    <div className="font-bold text-[14px] text-main">User Login</div>
                    {authType === 'LOGIN' && <CheckCircle size={18} className="text-blue-500" />}
                  </div>
                  <div className="text-[12px] text-muted">Users will log in with their email and password using a session token.</div>
                </div>

                <div 
                  onClick={() => setAuthType('STATIC')}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${authType === 'STATIC' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div className="flex-between mb-1">
                    <div className="font-bold text-[14px] text-main">Static API Credentials</div>
                    {authType === 'STATIC' && <CheckCircle size={18} className="text-blue-500" />}
                  </div>
                  <div className="text-[12px] text-muted">The application will authenticate directly as itself using hardcoded API keys. No login screen.</div>
                </div>

                <div 
                  onClick={() => setAuthType('PUBLIC')}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${authType === 'PUBLIC' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div className="flex-between mb-1">
                    <div className="font-bold text-[14px] text-main">Public (No Authentication)</div>
                    {authType === 'PUBLIC' && <CheckCircle size={18} className="text-blue-500" />}
                  </div>
                  <div className="text-[12px] text-muted">The application only accesses public data. No credentials required.</div>
                </div>
              </div>

              {authType === 'LOGIN' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-[14px] font-bold text-main mb-3">Select Authentication API</h4>
                  {authApis.length === 0 ? (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-[13px]">
                      No APPLICATION_SESSION API packages exist in this workspace. You must create one first.
                    </div>
                  ) : (
                    <div className="space-y-3 mb-6">
                      {authApis.map(api => (
                        <div 
                          key={api.id}
                          onClick={() => setFormData({...formData, authentication_api_id: api.id})}
                          className={`p-4 border rounded-xl cursor-pointer transition-all ${formData.authentication_api_id === api.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                        >
                          <div className="flex-between">
                            <div className="font-bold text-[14px] text-main">{api.name}</div>
                            {formData.authentication_api_id === api.id && <CheckCircle size={16} className="text-blue-500" />}
                          </div>
                          <div className="text-[12px] text-muted mt-1">{api.description || 'No description'}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.authentication_api_id && (
                    <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                      <div className="flex-between">
                        <div>
                          <h4 className="text-[14px] font-bold text-main">Allow Public Signup</h4>
                          <p className="text-[12px] text-muted mt-1">Allow users to register an account directly from the application's login screen.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={formData.registration_enabled}
                            onChange={(e) => setFormData({...formData, registration_enabled: e.target.checked})}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-bold text-main">API Access</h3>
              <p className="text-muted text-[13px] mb-4">Select the API Packages this application is allowed to consume.</p>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {accessApis.map(api => (
                  <div 
                    key={api.id}
                    onClick={() => toggleApiAccess(api.id)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${formData.api_access_ids.includes(api.id) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                  >
                    <div className="flex-between">
                      <div className="font-bold text-[14px] text-main">{api.name}</div>
                      {formData.api_access_ids.includes(api.id) && <CheckCircle size={16} className="text-green-500" />}
                    </div>
                    <div className="text-[12px] mt-1 font-semibold text-main">{api.auth_mode}</div>
                  </div>
                ))}
                {accessApis.length === 0 && (
                  <div className="text-[13px] text-muted text-center py-4">No compatible API packages found.</div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-bold text-main">Deployment Mode</h3>
              <p className="text-muted text-[13px] mb-4">Select how this application handles CORS.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setFormData({...formData, deployment_mode: 'DEVELOPMENT'})}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all relative ${formData.deployment_mode === 'DEVELOPMENT' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div className="flex-between mb-1">
                    <div className="font-bold text-[14px] text-main">Development</div>
                    {formData.deployment_mode === 'DEVELOPMENT' && <CheckCircle size={18} className="text-blue-500" />}
                  </div>
                  <div className="text-[12px] text-muted">Allows local development origins (e.g. localhost) for easy testing.</div>
                </div>

                <div 
                  onClick={() => setFormData({...formData, deployment_mode: 'DEPLOYED'})}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all relative ${formData.deployment_mode === 'DEPLOYED' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div className="flex-between mb-1">
                    <div className="font-bold text-[14px] text-main">Deployed</div>
                    {formData.deployment_mode === 'DEPLOYED' && <CheckCircle size={18} className="text-blue-500" />}
                  </div>
                  <div className="text-[12px] text-muted">Strict CORS. Only allows requests from the Application's verified domains.</div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-[13px] text-blue-800 font-medium text-center">
                  After creation, you can upload your static frontend files and configure custom domains in the Application Dashboard.
                </p>
              </div>
            </div>
          )}

        </div>
        
        <div className="modal-footer flex-between">
          <Button 
            variant="secondary"
            onClick={step === 1 ? onClose : handleBack}
            disabled={loading}
            icon={step > 1 ? ArrowLeft : null}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 4 ? (
            <Button 
              variant="primary"
              onClick={handleNext}
              iconRight={ArrowRight}
              disabled={
                (step === 1 && !formData.name) ||
                (step === 2 && (!authType || (authType === 'LOGIN' && !formData.authentication_api_id)))
              }
            >
              Next Step
            </Button>
          ) : (
            <Button 
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              icon={CheckCircle}
            >
              Create Application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
