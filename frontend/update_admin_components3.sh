#!/bin/bash

# AdminPermissions.jsx
cat << 'FILE' > src/components/admin/AdminPermissions.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Plus, Trash2, Shield } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function AdminPermissions() {
  const { applicationId } = useParams();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await appClient.get(\`/applications/\${applicationId}/permissions\`);
        setPermissions(res.data.permissions);
      } catch (err) {
        console.error("Failed to load permissions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, [applicationId]);

  const columns = [
    { header: 'User Email', field: 'email', render: (row) => <span className="font-medium">{row.email}</span> },
    { header: 'Device ID', field: 'device_id', render: (row) => <code className="text-xs bg-black/20 p-1 rounded">{row.device_id}</code> },
    { header: 'Action Level', field: 'action', render: (row) => (
      <Badge variant={row.action === 'WRITE' ? 'danger' : 'primary'}>{row.action}</Badge>
    )},
    { header: 'Actions', render: (row) => (
      <Button variant="icon" className="text-red-400 hover:text-red-300"><Trash2 size={16} /></Button>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="Device Permissions" 
        description="Granular control over which users can read from or write to specific devices."
        action={<Button icon={Plus}>Add Permission</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={permissions} 
          loading={loading} 
          emptyMessage="No device-specific permissions set."
        />
      </Card>
    </div>
  );
}
FILE

# AdminSettings.jsx
cat << 'FILE' > src/components/admin/AdminSettings.jsx
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
  const { authSettings } = useApplicationAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    auth_enabled: false,
    registration_enabled: false
  });

  useEffect(() => {
    if (authSettings) {
      setFormData({
        name: authSettings.display_name || authSettings.name || '',
        description: authSettings.description || '',
        logo_url: authSettings.logo_url || '',
        auth_enabled: authSettings.authentication_enabled || false,
        registration_enabled: authSettings.registration_enabled || false
      });
    }
  }, [authSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Endpoint to save settings would be called here
      alert('Settings saved (mock)');
    } catch (err) {
      console.error(err);
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
          <form onSubmit={handleSubmit}>
            <Input 
              label="Application Name" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <Input 
              label="Description" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
            <Input 
              label="Logo URL" 
              value={formData.logo_url}
              onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
              helperText="Must be a valid HTTPS URL pointing to an image."
            />
            <Button type="submit" icon={Save} className="mt-4">Save Branding</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Security</h3>
          <form onSubmit={handleSubmit}>
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

            <Button type="submit" icon={Save} className="mt-4">Save Security</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
FILE

chmod +x update_admin_components3.sh
./update_admin_components3.sh
