import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Plus, Trash2, Key, Copy, AlertTriangle } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Badge from '../ui/Badge';

export default function AdminApiKeys() {
  const { applicationId } = useParams();
  const [apis, setApis] = useState([]);
  const [selectedApiId, setSelectedApiId] = useState('');
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Create Key Modal
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Raw key display
  const [newRawKey, setNewRawKey] = useState(null);

  useEffect(() => {
    const fetchApis = async () => {
      try {
        const res = await appClient.get(`/applications/${applicationId}/apis`);
        setApis(res.data.apis || []);
        if (res.data.apis?.length > 0) {
          setSelectedApiId(res.data.apis[0].id);
        }
      } catch (err) {
        console.error("Failed to load APIs", err);
      }
    };
    fetchApis();
  }, [applicationId]);

  useEffect(() => {
    if (!selectedApiId) return;
    const fetchKeys = async () => {
      setLoading(true);
      try {
        const res = await appClient.get(`/applications/${applicationId}/apis/${selectedApiId}/keys`);
        setKeys(res.data.keys || []);
      } catch (err) {
        console.error("Failed to load API keys", err);
      } finally {
        setLoading(false);
      }
    };
    fetchKeys();
  }, [applicationId, selectedApiId]);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName || !selectedApiId) return;
    setSaving(true);
    try {
      const res = await appClient.post(`/applications/${applicationId}/apis/${selectedApiId}/keys`, {
        name: newKeyName,
        expires_in_days: 365
      });
      setNewRawKey(res.data.raw_api_key);
      setKeys([...keys, res.data.key_record]);
      setShowModal(false);
      setNewKeyName('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate key');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (keyId) => {
    if (!confirm('Are you sure you want to delete this API Key? Any application using it will break.')) return;
    try {
      await appClient.delete(`/applications/${applicationId}/apis/${selectedApiId}/keys/${keyId}`);
      setKeys(keys.filter(k => k.id !== keyId));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Key Name', field: 'name', render: (row) => <span className="font-bold">{row.name}</span> },
    { header: 'Prefix', field: 'key_prefix', render: (row) => <code className="text-xs bg-black/20 p-1 rounded">{row.key_prefix}****</code> },
    { header: 'Status', field: 'status', render: (row) => <Badge variant={row.status === 'ACTIVE' ? 'success' : 'danger'}>{row.status}</Badge> },
    { header: 'Created', field: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
    { header: 'Last Used', field: 'last_used_at', render: (row) => row.last_used_at ? new Date(row.last_used_at).toLocaleDateString() : 'Never' },
    { header: 'Actions', render: (row) => (
      <Button variant="icon" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(row.id)}>
        <Trash2 size={16} />
      </Button>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="API Keys" 
        description="Manage API keys used to authenticate programmatic access to your custom APIs."
        action={<Button icon={Plus} onClick={() => { setNewRawKey(null); setShowModal(true); }} disabled={!selectedApiId}>Generate Key</Button>}
      />
      
      {newRawKey && (
        <Card className="mb-6 p-6 border border-green-500/50 bg-green-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-green-500 shrink-0 mt-1" />
            <div>
              <h3 className="text-green-500 font-bold mb-2">Save your API Key!</h3>
              <p className="text-sm mb-4">This is the only time the full API key will be displayed. Please store it securely.</p>
              <div className="flex items-center gap-2">
                <code className="bg-black/40 p-3 rounded flex-1 select-all font-mono text-lg">{newRawKey}</code>
                <Button variant="secondary" icon={Copy} onClick={() => navigator.clipboard.writeText(newRawKey)}>Copy</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {apis.length === 0 ? (
        <Card className="p-8 text-center text-muted">
          <p>No Dynamic APIs exist yet. Create an API first before generating keys.</p>
        </Card>
      ) : (
        <>
          <div className="mb-6 max-w-sm">
            <label className="block text-sm font-medium mb-1 text-muted">Select API</label>
            <Select 
              value={selectedApiId} 
              onChange={e => setSelectedApiId(e.target.value)}
              className="w-full"
            >
              {apis.map(api => <option key={api.id} value={api.id}>{api.name} (/api/{api.slug})</option>)}
            </Select>
          </div>
          <Card>
            <Table 
              columns={columns} 
              data={keys} 
              loading={loading} 
              emptyMessage="No API keys generated for this API."
            />
          </Card>
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate API Key">
        <form onSubmit={handleCreateKey}>
          <div className="mb-4">
            <Input
              label="Key Name (e.g. 'Production Server')"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Generate</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
