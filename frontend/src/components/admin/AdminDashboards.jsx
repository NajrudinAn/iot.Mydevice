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
        const res = await appClient.get(`/applications/${applicationId}/dashboards`);
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
        <Button variant="icon" onClick={() => navigate(`../../dashboards/${row.id}/edit`)}><Edit size={16} /></Button>
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
