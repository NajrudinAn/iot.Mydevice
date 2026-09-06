#!/bin/bash

# AdminApiKeys.jsx
cat << 'FILE' > src/components/admin/AdminApiKeys.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Plus, Trash2, Key } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';

export default function AdminApiKeys() {
  const { applicationId } = useParams();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const res = await appClient.get(\`/applications/\${applicationId}/apikeys\`);
        setKeys(res.data.keys);
      } catch (err) {
        console.error("Failed to load API keys", err);
      } finally {
        setLoading(false);
      }
    };
    fetchKeys();
  }, [applicationId]);

  const columns = [
    { header: 'Key Name', field: 'name', render: (row) => <span className="font-bold">{row.name}</span> },
    { header: 'Prefix', field: 'key_prefix', render: (row) => <code className="text-xs bg-black/20 p-1 rounded">{row.key_prefix}****</code> },
    { header: 'Created', field: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
    { header: 'Actions', render: (row) => (
      <Button variant="icon" className="text-red-400 hover:text-red-300"><Trash2 size={16} /></Button>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="API Keys" 
        description="Manage API keys used to authenticate programmatic access."
        action={<Button icon={Plus}>Generate Key</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={keys} 
          loading={loading} 
          emptyMessage="No API keys generated."
        />
      </Card>
    </div>
  );
}
FILE

# AdminDomains.jsx
cat << 'FILE' > src/components/admin/AdminDomains.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function AdminDomains() {
  const { applicationId } = useParams();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const res = await appClient.get(\`/applications/\${applicationId}/domains\`);
        setDomains(res.data.domains);
      } catch (err) {
        console.error("Failed to load domains", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDomains();
  }, [applicationId]);

  const columns = [
    { header: 'Domain', field: 'domain', render: (row) => <span className="font-medium">{row.domain}</span> },
    { header: 'Status', field: 'status', render: (row) => (
      <Badge variant={row.verified ? 'success' : 'warning'}>
        {row.verified ? 'Verified' : 'Pending'}
      </Badge>
    )},
    { header: 'Actions', render: (row) => (
      <div className="flex gap-2">
        {!row.verified && <Button variant="secondary" size="sm">Verify</Button>}
        <Button variant="icon" className="text-red-400 hover:text-red-300"><Trash2 size={16} /></Button>
      </div>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="Custom Domains" 
        description="Configure custom domain routing for this application."
        action={<Button icon={Plus}>Add Domain</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={domains} 
          loading={loading} 
          emptyMessage="No custom domains configured."
        />
      </Card>
    </div>
  );
}
FILE

# AdminDashboards.jsx
cat << 'FILE' > src/components/admin/AdminDashboards.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Plus, Trash2, Edit, LayoutDashboard, Copy } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function AdminDashboards() {
  const { applicationId } = useParams();
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const res = await appClient.get(\`/applications/\${applicationId}/dashboards\`);
        setDashboards(res.data.dashboards);
      } catch (err) {
        console.error("Failed to load dashboards", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboards();
  }, [applicationId]);

  const columns = [
    { header: 'Title', field: 'title', render: (row) => <span className="font-bold">{row.title}</span> },
    { header: 'Visibility', field: 'is_public', render: (row) => (
      <Badge variant={row.is_public ? 'success' : 'neutral'}>
        {row.is_public ? 'Public' : 'Private'}
      </Badge>
    )},
    { header: 'Actions', render: (row) => (
      <div className="flex gap-2">
        <Button variant="icon" onClick={() => navigate(\`../../dashboards/\${row.id}/edit\`)}><Edit size={16} /></Button>
        <Button variant="icon"><Copy size={16} /></Button>
        <Button variant="icon" className="text-red-400 hover:text-red-300"><Trash2 size={16} /></Button>
      </div>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="Dashboard Management" 
        description="Manage visibility, ordering, and structure of your dashboards."
        action={<Button icon={Plus} onClick={() => alert('Create dashboard not implemented in UI yet')}>Create Dashboard</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={dashboards} 
          loading={loading} 
          emptyMessage="No dashboards created."
        />
      </Card>
    </div>
  );
}
FILE

# AdminDataSources.jsx
cat << 'FILE' > src/components/admin/AdminDataSources.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Plus, Trash2, Database, Edit } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';

export default function AdminDataSources() {
  const { applicationId } = useParams();
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await appClient.get(\`/applications/\${applicationId}/data-sources\`);
        setDataSources(res.data.dataSources);
      } catch (err) {
        console.error("Failed to load data sources", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSources();
  }, [applicationId]);

  const columns = [
    { header: 'Name', field: 'name', render: (row) => <span className="font-bold">{row.name}</span> },
    { header: 'Type', field: 'source_type', render: (row) => <span className="uppercase text-xs font-semibold text-muted">{row.source_type}</span> },
    { header: 'Devices', render: (row) => (
      <span className="text-sm">{(row.devices || []).length} mapped</span>
    )},
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
        title="Data Sources" 
        description="Configure telemetry streams mapped to devices for dashboard visualization."
        action={<Button icon={Plus}>Create Data Source</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={dataSources} 
          loading={loading} 
          emptyMessage="No data sources configured."
        />
      </Card>
    </div>
  );
}
FILE

chmod +x update_admin_components2.sh
./update_admin_components2.sh
