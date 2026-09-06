import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Database } from 'lucide-react';
import Table from '../ui/Table';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';

export default function AdminDataSources() {
  const { applicationId } = useParams();
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await appClient.get(`/applications/${applicationId}/data-sources`);
        setDataSources(res.data.dataSources || []);
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
    )}
  ];

  return (
    <div>
      <PageHeader 
        title="Data Sources" 
        description="View telemetry streams mapped to devices for dashboard visualization."
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
