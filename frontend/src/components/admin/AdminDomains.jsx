import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';

export default function AdminDomains() {
  const { applicationId } = useParams();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDomains = async () => {
    try {
      const res = await appClient.get(`/applications/${applicationId}/domains`);
      setDomains(res.data.domains || []);
    } catch (err) {
      console.error("Failed to load domains", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [applicationId]);

  const handleAddDomain = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await appClient.post(`/applications/${applicationId}/domains`, { domain: newDomain });
      setShowModal(false);
      setNewDomain('');
      fetchDomains();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add domain');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (domainId) => {
    try {
      await appClient.post(`/applications/${applicationId}/domains/${domainId}/verify`);
      fetchDomains();
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleDelete = async (domainId) => {
    if (!confirm('Remove this custom domain?')) return;
    try {
      await appClient.delete(`/applications/${applicationId}/domains/${domainId}`);
      fetchDomains();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Domain', field: 'domain', render: (row) => <span className="font-medium">{row.domain}</span> },
    { header: 'Status', field: 'status', render: (row) => (
      <Badge variant={row.verified ? 'success' : 'warning'}>
        {row.verified ? 'Verified' : 'Pending Verification'}
      </Badge>
    )},
    { header: 'Actions', render: (row) => (
      <div className="flex gap-2">
        {!row.verified && <Button variant="secondary" size="sm" onClick={() => handleVerify(row.id)}>Verify DNS</Button>}
        <Button variant="icon" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(row.id)}><Trash2 size={16} /></Button>
      </div>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="Custom Domains" 
        description="Configure custom domain routing for this application."
        action={<Button icon={Plus} onClick={() => setShowModal(true)}>Add Domain</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={domains} 
          loading={loading} 
          emptyMessage="No custom domains configured."
        />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Custom Domain">
        <form onSubmit={handleAddDomain}>
          <div className="mb-4">
            <p className="text-sm text-muted mb-4">
              Enter the domain you want to route to this application. You will need to configure DNS records before it can be verified.
            </p>
            <Input
              label="Domain Name"
              placeholder="e.g. app.mycompany.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Domain</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
