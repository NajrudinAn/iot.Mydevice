import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appClient } from '../api/client';
import { Server, Activity } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';

export default function UserDevices() {
  const { applicationId, applicationSlug } = useParams();
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const basePath = applicationSlug ? `/app/${applicationSlug}` : `/applications/${applicationId}`;

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await appClient.get(`/applications/${applicationId}/devices`);
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
    { header: 'Name', field: 'name', render: (row) => <div className="font-medium cursor-pointer text-primary hover:underline" onClick={() => navigate(`${basePath}/devices/${row.device_id}`)}>{row.name || 'Unnamed Device'}</div> },
    { header: 'Device ID', field: 'device_id', render: (row) => <code className="text-xs bg-black/20 p-1 rounded">{row.device_id}</code> },
    { header: 'Actions', render: (row) => (
      <Button variant="secondary" size="sm" icon={Activity} onClick={() => navigate(`${basePath}/devices/${row.device_id}`)}>Inspect Telemetry</Button>
    ) }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader 
        title="Authorized Devices" 
        description="View devices assigned to this application that you have permission to access."
      />
      <Card>
        <Table 
          columns={columns} 
          data={devices} 
          loading={loading} 
          keyField="device_id"
          emptyMessage="No devices assigned or authorized for your role."
        />
      </Card>
    </div>
  );
}
