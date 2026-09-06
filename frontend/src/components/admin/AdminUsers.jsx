import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appClient } from '../../api/client';
import { Trash2, Plus, Mail } from 'lucide-react';
import Table from '../ui/Table';
import Button from '../ui/Button';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Input from '../ui/Input';

export default function AdminUsers() {
  const { applicationId } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('VIEWER');
  const [addingUser, setAddingUser] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await appClient.get(`/applications/${applicationId}/users`);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [applicationId]);

  const handleUpdate = async (userId, data) => {
    try {
      await appClient.patch(`/applications/${applicationId}/users/${userId}`, data);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      alert('Please enter an email address');
      return;
    }
    
    setAddingUser(true);
    try {
      // In a real scenario, the backend endpoint for adding a user to an app
      await appClient.post(`/applications/${applicationId}/users`, {
        email: newUserEmail,
        role: newUserRole
      });
      setIsAddModalOpen(false);
      setNewUserEmail('');
      setNewUserRole('VIEWER');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  const roleColors = {
    ADMIN: 'danger',
    OPERATOR: 'primary',
    VIEWER: 'neutral'
  };

  const columns = [
    { header: 'Email', field: 'email', render: (row) => <span className="font-medium">{row.email}</span> },
    { header: 'Status', field: 'status', render: (row) => (
      <Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'PENDING' ? 'warning' : 'neutral'}>
        {row.status}
      </Badge>
    ) },
    { header: 'Role', field: 'role', render: (row) => (
      <Select 
        value={row.role} 
        onChange={(e) => handleUpdate(row.id, { role: e.target.value })}
        className="w-32"
      >
        <option value="ADMIN">ADMIN</option>
        <option value="OPERATOR">OPERATOR</option>
        <option value="VIEWER">VIEWER</option>
      </Select>
    ) },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-2">
        {row.status === 'PENDING' && (
          <Button variant="secondary" size="sm" onClick={() => handleUpdate(row.id, { status: 'ACTIVE' })}>
            Approve
          </Button>
        )}
        <Button variant="icon" className="text-red-400 hover:text-red-300" onClick={() => {
          if (confirm('Remove user from application?')) {
            appClient.delete(`/applications/${applicationId}/users/${row.id}`).then(fetchUsers).catch(e => alert(e.response?.data?.message || 'Delete failed'));
          }
        }}><Trash2 size={16} /></Button>
      </div>
    ) }
  ];

  return (
    <div>
      <PageHeader 
        title="Users & Roles" 
        description="Manage application users and their access levels."
        action={<Button icon={Plus} onClick={() => setIsAddModalOpen(true)}>Add User</Button>}
      />
      <Card>
        <Table 
          columns={columns} 
          data={users} 
          loading={loading} 
          emptyMessage="No users found."
        />
      </Card>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Add User to Application"
        footer={
          <div className="flex gap-3 justify-end w-full">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} loading={addingUser}>Add User</Button>
          </div>
        }
      >
        <div className="flex-column gap-4">
          <p className="text-muted text-sm">
            Add a user to this application. The user must already have a MyDevice platform account.
          </p>
          <div>
            <label className="ds-label">User Email</label>
            <Input 
              icon={Mail}
              placeholder="user@example.com" 
              value={newUserEmail} 
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="ds-label">Application Role</label>
            <Select 
              value={newUserRole} 
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full"
            >
              <option value="VIEWER">VIEWER (Read Only)</option>
              <option value="OPERATOR">OPERATOR (Device Control)</option>
              <option value="ADMIN">ADMIN (Full Access)</option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
