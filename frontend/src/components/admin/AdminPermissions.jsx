import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Badge from '../ui/Badge';

export default function AdminPermissions() {
  const { applicationId } = useParams();
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    device_id: '',
    can_view: true,
    can_read_data: true,
    can_command: false
  });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [permRes, userRes, devRes] = await Promise.all([
        appClient.get(`/applications/${applicationId}/permissions`),
        appClient.get(`/applications/${applicationId}/users`),
        appClient.get(`/applications/${applicationId}/devices`)
      ]);
      setPermissions(permRes.data.permissions || []);
      setUsers(userRes.data.users || []);
      setDevices(devRes.data.devices || []);
    } catch (err) {
      console.error("Failed to load permissions data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [applicationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_id || !formData.device_id) return alert('Select user and device');
    
    setSaving(true);
    try {
      await appClient.patch(`/applications/${applicationId}/devices/${formData.device_id}/permissions`, {
        user_id: formData.user_id,
        can_view: formData.can_view,
        can_read_data: formData.can_read_data,
        can_command: formData.can_command
      });
      setShowModal(false);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId, deviceId) => {
    if (!confirm('Revoke all permissions for this user on this device?')) return;
    try {
      // Patch all false to effectively revoke
      await appClient.patch(`/applications/${applicationId}/devices/${deviceId}/permissions`, {
        user_id: userId,
        can_view: false,
        can_read_data: false,
        can_command: false
      });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke permissions');
    }
  };

  const RenderBool = ({ val }) => val ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500/50" />;

  const columns = [
    { header: 'User Email', field: 'email', render: (row) => <span className="font-medium">{row.email}</span> },
    { header: 'Device', field: 'public_device_id', render: (row) => <code className="text-xs bg-black/20 p-1 rounded">{row.public_device_id}</code> },
    { header: 'View', render: (row) => <RenderBool val={row.can_view} /> },
    { header: 'Read Data', render: (row) => <RenderBool val={row.can_read_data} /> },
    { header: 'Command', render: (row) => <RenderBool val={row.can_command} /> },
    { header: 'Actions', render: (row) => (
      <Button variant="icon" className="text-red-400 hover:text-red-300" onClick={() => handleRemove(row.user_id, row.device_id)}>
        <Trash2 size={16} />
      </Button>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="Device Permissions" 
        description="Granular control over which users can read from or write to specific devices."
        action={<Button icon={Plus} onClick={() => setShowModal(true)}>Set Permission</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={permissions} 
          loading={loading} 
          emptyMessage="No device-specific permissions set."
        />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Set Device Permission">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-muted">User</label>
            <Select 
              value={formData.user_id} 
              onChange={e => setFormData({...formData, user_id: e.target.value})}
              required
              className="w-full"
            >
              <option value="">Select a user...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.email} ({u.role})</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted">Device</label>
            <Select 
              value={formData.device_id} 
              onChange={e => setFormData({...formData, device_id: e.target.value})}
              required
              className="w-full"
            >
              <option value="">Select a device...</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name || d.device_id}</option>)}
            </Select>
          </div>
          <div className="flex gap-6 mt-4 p-4 border border-white/10 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.can_view} onChange={e => setFormData({...formData, can_view: e.target.checked})} />
              <span className="text-sm">Can View</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.can_read_data} onChange={e => setFormData({...formData, can_read_data: e.target.checked})} />
              <span className="text-sm">Can Read Data</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.can_command} onChange={e => setFormData({...formData, can_command: e.target.checked})} />
              <span className="text-sm">Can Command</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Permission</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
