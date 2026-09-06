import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Save } from 'lucide-react';
import { useApplicationAuth } from '../../context/ApplicationAuthContext';

export default function AdminSettings() {
  const { applicationId } = useParams();
  const { authSettings, checkAuth } = useApplicationAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    auth_enabled: false,
    registration_enabled: false,
    approval_required: true,
    data_retention_days: 0
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);

  useEffect(() => {
    if (authSettings) {
      setFormData({
        name: authSettings.display_name || authSettings.name || '',
        description: authSettings.description || '',
        logo_url: authSettings.logo_url || '',
        auth_enabled: authSettings.authentication_enabled || false,
        registration_enabled: authSettings.registration_enabled || false,
        approval_required: authSettings.approval_required ?? true,
        data_retention_days: authSettings.data_retention_days ?? 0
      });
    }
  }, [authSettings]);

  const handleBrandSubmit = async (e) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      await appClient.put(`/applications/${applicationId}/branding`, {
        display_name: formData.name,
        logo_url: formData.logo_url,
      });
      alert('Branding saved successfully');
      checkAuth();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save branding');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    setSavingSecurity(true);
    try {
      await appClient.patch(`/applications/${applicationId}/auth/settings`, {
        authentication_enabled: formData.auth_enabled,
        registration_enabled: formData.registration_enabled,
        approval_required: formData.approval_required
      });
      alert('Security settings saved successfully');
      checkAuth();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save security settings');
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleRetentionSubmit = async (e) => {
    e.preventDefault();
    setSavingRetention(true);
    try {
      await appClient.patch(`/applications/${applicationId}/retention`, {
        data_retention_days: parseInt(formData.data_retention_days)
      });
      alert('Data retention settings saved successfully');
      checkAuth();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save retention settings');
    } finally {
      setSavingRetention(false);
    }
  };

  return (
    <div>
      <PageHeader 
        title="Application Settings" 
        description="Configure branding, authentication rules, and general application properties."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Branding</h3>
          <form onSubmit={handleBrandSubmit}>
            <div className="mb-4">
              <Input 
                label="Application Display Name" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <Input 
                label="Logo URL" 
                value={formData.logo_url}
                onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                helperText="Must be a valid HTTPS URL pointing to an image."
              />
            </div>
            <Button type="submit" loading={savingBrand} icon={Save} className="mt-4">Save Branding</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Security</h3>
          <form onSubmit={handleSecuritySubmit}>
            <div className="flex items-center gap-3 mb-4 p-4 border border-white/10 rounded-lg bg-black/20">
              <input 
                type="checkbox" 
                className="form-checkbox" 
                id="auth_enabled"
                checked={formData.auth_enabled}
                onChange={(e) => setFormData({...formData, auth_enabled: e.target.checked})}
              />
              <div>
                <label htmlFor="auth_enabled" className="font-semibold block cursor-pointer">Require Authentication</label>
                <span className="text-sm text-muted">If disabled, the application is public to anyone.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4 p-4 border border-white/10 rounded-lg bg-black/20">
              <input 
                type="checkbox" 
                className="form-checkbox" 
                id="reg_enabled"
                checked={formData.registration_enabled}
                disabled={!formData.auth_enabled}
                onChange={(e) => setFormData({...formData, registration_enabled: e.target.checked})}
              />
              <div className={!formData.auth_enabled ? 'opacity-50' : ''}>
                <label htmlFor="reg_enabled" className="font-semibold block cursor-pointer">Enable Public Registration</label>
                <span className="text-sm text-muted">Allow anyone to create an account.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4 p-4 border border-white/10 rounded-lg bg-black/20">
              <input 
                type="checkbox" 
                className="form-checkbox" 
                id="app_req"
                checked={formData.approval_required}
                disabled={!formData.auth_enabled || !formData.registration_enabled}
                onChange={(e) => setFormData({...formData, approval_required: e.target.checked})}
              />
              <div className={(!formData.auth_enabled || !formData.registration_enabled) ? 'opacity-50' : ''}>
                <label htmlFor="app_req" className="font-semibold block cursor-pointer">Require Admin Approval</label>
                <span className="text-sm text-muted">If enabled, new users start as PENDING and cannot access data.</span>
              </div>
            </div>

            <Button type="submit" loading={savingSecurity} icon={Save} className="mt-4">Save Security</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Data Retention</h3>
          <p className="text-sm text-muted mb-4">
            Configure how long telemetry data from assigned devices is retained in the database.
          </p>
          <form onSubmit={handleRetentionSubmit}>
            <div className="flex flex-col gap-3 mb-6">
              <label className="flex items-center gap-3 p-3 border border-white/10 rounded-lg bg-black/20 cursor-pointer">
                <input 
                  type="radio" 
                  name="retention" 
                  className="form-radio text-blue"
                  value="7"
                  checked={parseInt(formData.data_retention_days) === 7}
                  onChange={(e) => setFormData({...formData, data_retention_days: parseInt(e.target.value)})}
                />
                <span className="font-semibold">7 days</span>
              </label>
              
              <label className="flex items-center gap-3 p-3 border border-white/10 rounded-lg bg-black/20 cursor-pointer">
                <input 
                  type="radio" 
                  name="retention" 
                  className="form-radio text-blue"
                  value="30"
                  checked={parseInt(formData.data_retention_days) === 30}
                  onChange={(e) => setFormData({...formData, data_retention_days: parseInt(e.target.value)})}
                />
                <span className="font-semibold">30 days</span>
              </label>

              <label className="flex items-center gap-3 p-3 border border-white/10 rounded-lg bg-black/20 cursor-pointer">
                <input 
                  type="radio" 
                  name="retention" 
                  className="form-radio text-blue"
                  value="0"
                  checked={parseInt(formData.data_retention_days) === 0}
                  onChange={(e) => setFormData({...formData, data_retention_days: parseInt(e.target.value)})}
                />
                <span className="font-semibold">Forever</span>
              </label>
            </div>
            
            <Button type="submit" loading={savingRetention} icon={Save}>Save</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
