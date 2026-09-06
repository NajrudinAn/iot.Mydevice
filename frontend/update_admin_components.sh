#!/bin/bash

# AdminOverview.jsx
cat << 'FILE' > src/components/admin/AdminOverview.jsx
import React from 'react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import { Shield, Users, Server, Database } from 'lucide-react';
import { useApplicationAuth } from '../../context/ApplicationAuthContext';

export default function AdminOverview() {
  const { authSettings } = useApplicationAuth();

  return (
    <div>
      <PageHeader 
        title="Administration Overview" 
        description="Manage your application settings, users, and connected devices."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-t-4 border-t-primary">
          <Shield size={24} className="text-primary mb-4" />
          <h3 className="font-bold text-lg">Authentication</h3>
          <p className="text-sm text-muted mt-1">
            Status: {authSettings?.authentication_enabled ? 'Enabled' : 'Disabled'}
          </p>
        </Card>
        
        <Card className="p-6 border-t-4 border-t-secondary">
          <Users size={24} className="text-secondary mb-4" />
          <h3 className="font-bold text-lg">Access Control</h3>
          <p className="text-sm text-muted mt-1">Manage Roles & Users</p>
        </Card>
        
        <Card className="p-6 border-t-4 border-t-accent">
          <Server size={24} className="text-accent mb-4" />
          <h3 className="font-bold text-lg">Devices</h3>
          <p className="text-sm text-muted mt-1">Manage MQTT Devices</p>
        </Card>
        
        <Card className="p-6 border-t-4 border-t-[#f59e0b]">
          <Database size={24} className="text-[#f59e0b] mb-4" />
          <h3 className="font-bold text-lg">Data Sources</h3>
          <p className="text-sm text-muted mt-1">Map Telemetry to Dashboards</p>
        </Card>
      </div>
    </div>
  );
}
FILE

# AdminDevices.jsx
cat << 'FILE' > src/components/admin/AdminDevices.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Trash2, Plus, Server } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';

export default function AdminDevices() {
  const { applicationId } = useParams();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await appClient.get(\`/applications/\${applicationId}/devices\`);
        setDevices(res.data.devices);
      } catch (err) {
        console.error("Failed to load devices", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, [applicationId]);

  const columns = [
    { header: 'Name', field: 'name', render: (row) => <div className="font-medium">{row.name || 'Unnamed Device'}</div> },
    { header: 'Device ID', field: 'device_id', render: (row) => <code className="text-xs bg-black/20 p-1 rounded">{row.device_id}</code> },
    { header: 'Actions', render: (row) => (
      <Button variant="icon" className="text-red-400 hover:text-red-300" title="Remove from App">
        <Trash2 size={16} />
      </Button>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="Devices & Telemetry" 
        description="Manage the physical devices assigned to this application."
        action={<Button icon={Plus}>Assign Device</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={devices} 
          loading={loading} 
          keyField="device_id"
          emptyMessage="No devices assigned to this application."
        />
      </Card>
    </div>
  );
}
FILE

# AdminUsers.jsx
cat << 'FILE' > src/components/admin/AdminUsers.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Trash2, Edit, Plus, Users } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function AdminUsers() {
  const { applicationId } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await appClient.get(\`/applications/\${applicationId}/users\`);
        setUsers(res.data.users);
      } catch (err) {
        console.error("Failed to load users", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [applicationId]);

  const roleColors = {
    ADMIN: 'danger',
    OPERATOR: 'primary',
    VIEWER: 'neutral'
  };

  const columns = [
    { header: 'Email', field: 'email', render: (row) => <span className="font-medium">{row.email}</span> },
    { header: 'Role', field: 'role', render: (row) => <Badge variant={roleColors[row.role]}>{row.role}</Badge> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-2">
        <Button variant="icon"><Edit size={16} /></Button>
        <Button variant="icon" className="text-red-400 hover:text-red-300"><Trash2 size={16} /></Button>
      </div>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="Users & Roles" 
        description="Manage application users and their access levels."
        action={<Button icon={Plus}>Add User</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={users} 
          loading={loading} 
          emptyMessage="No users found."
        />
      </Card>
    </div>
  );
}
FILE

# AdminApis.jsx
cat << 'FILE' > src/components/admin/AdminApis.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Plus, Trash2, Globe } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function AdminApis() {
  const { applicationId } = useParams();
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApis = async () => {
      try {
        const res = await appClient.get(\`/applications/\${applicationId}/apis\`);
        setApis(res.data.apis);
      } catch (err) {
        console.error("Failed to load APIs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchApis();
  }, [applicationId]);

  const columns = [
    { header: 'Name', field: 'name', render: (row) => <span className="font-bold">{row.name}</span> },
    { header: 'Method', field: 'method', render: (row) => <Badge variant={row.method === 'GET' ? 'success' : 'primary'}>{row.method}</Badge> },
    { header: 'Endpoint', field: 'endpoint', render: (row) => <code className="text-xs bg-black/20 p-1 rounded">{row.endpoint}</code> },
    { header: 'Actions', render: (row) => (
      <Button variant="icon" className="text-red-400 hover:text-red-300"><Trash2 size={16} /></Button>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="Dynamic APIs" 
        description="Build custom API endpoints for data retrieval and integration."
        action={<Button icon={Plus}>Create API Endpoint</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={apis} 
          loading={loading} 
          emptyMessage="No custom APIs created yet."
        />
      </Card>
    </div>
  );
}
FILE

chmod +x update_admin_components.sh
./update_admin_components.sh
