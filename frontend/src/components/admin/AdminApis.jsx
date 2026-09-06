import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Plus, Trash2, Webhook, Settings2 } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';

export default function AdminApis() {
  const { applicationId } = useParams();
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', authentication_required: 'true' });
  const [saving, setSaving] = useState(false);

  const fetchApis = async () => {
    try {
      const res = await appClient.get(`/applications/${applicationId}/apis`);
      setApis(res.data.apis || []);
    } catch (err) {
      console.error("Failed to load APIs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, [applicationId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await appClient.post(`/applications/${applicationId}/apis`, {
        ...formData,
        authentication_required: formData.authentication_required === 'true'
      });
      setShowModal(false);
      setFormData({ name: '', slug: '', description: '', authentication_required: 'true' });
      fetchApis();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create API');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: 'Name', field: 'name', render: (row) => <span className="font-bold">{row.name}</span> },
    { header: 'Slug', field: 'slug', render: (row) => <code className="text-xs bg-black/20 p-1 rounded">/api/{row.slug}</code> },
    { header: 'Auth', field: 'auth', render: (row) => <Badge variant={row.authentication_required ? 'warning' : 'neutral'}>{row.authentication_required ? 'REQUIRED' : 'NONE'}</Badge> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" icon={Settings2}>Fields</Button>
      </div>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="Custom APIs" 
        description="Build custom API endpoints to retrieve your device data."
        action={<Button icon={Plus} onClick={() => setShowModal(true)}>Create API</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={apis} 
          loading={loading} 
          emptyMessage="No custom APIs created yet."
        />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create API Endpoint">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="API Name" value={formData.name} onChange={e => {
            setFormData({...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')});
          }} required />
          <Input label="Endpoint Slug" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} required />
          <Input label="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          <div>
            <label className="block text-sm font-medium mb-1 text-muted">Authentication Required</label>
            <Select value={formData.authentication_required} onChange={e => setFormData({...formData, authentication_required: e.target.value})} className="w-full">
              <option value="true">Yes (Require API Key)</option>
              <option value="false">No (Public Endpoint)</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create API</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
