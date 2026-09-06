import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appClient } from '../api/client';
import { LayoutDashboard, Plus } from 'lucide-react';
import { useApplicationAuth } from '../context/ApplicationAuthContext';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';

export default function DashboardsList() {
  const { applicationId, applicationSlug } = useParams();
  const { appUser } = useApplicationAuth();
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDashName, setNewDashName] = useState('');
  const [newDashSlug, setNewDashSlug] = useState('');
  const [newDashVisibility, setNewDashVisibility] = useState('PRIVATE');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const basePath = applicationSlug ? `/app/${applicationSlug}` : `/applications/${applicationId}`;

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

  useEffect(() => {
    fetchDashboards();
  }, [applicationId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await appClient.post(`/applications/${applicationId}/dashboards`, {
        name: newDashName,
        slug: newDashSlug,
        visibility: newDashVisibility
      });
      setShowModal(false);
      setNewDashName('');
      setNewDashSlug('');
      fetchDashboards();
    } catch (err) {
      alert("Failed to create dashboard: " + err.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  const canCreate = appUser?.loggedIn && appUser?.role !== 'VIEWER';

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader 
        title="Dashboards" 
        description="Select a dashboard to view or edit."
        action={canCreate && <Button icon={Plus} onClick={() => setShowModal(true)}>New Dashboard</Button>}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Dashboard">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Input 
              label="Dashboard Name" 
              required 
              value={newDashName} 
              onChange={e => {
                setNewDashName(e.target.value); 
                setNewDashSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
              }} 
            />
          </div>
          <div>
            <Input 
              label="Slug" 
              required 
              value={newDashSlug} 
              onChange={e => setNewDashSlug(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted">Visibility</label>
            <Select value={newDashVisibility} onChange={e => setNewDashVisibility(e.target.value)} className="w-full">
              <option value="PRIVATE">Private (Requires Login)</option>
              <option value="PUBLIC">Public (No Login Required)</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create</Button>
          </div>
        </form>
      </Modal>

      {loading ? (
        <Card className="p-12 text-center text-muted">Loading...</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map(dash => (
            <Card 
              key={dash.id} 
              className="p-6 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`${basePath}/dashboards/${dash.id}/view`)}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <LayoutDashboard size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{dash.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={dash.visibility === 'PUBLIC' ? 'success' : 'neutral'}>
                      {dash.visibility}
                    </Badge>
                    <Badge variant={dash.is_active ? 'success' : 'danger'}>
                      {dash.is_active ? 'ACTIVE' : 'DISABLED'}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-muted text-sm">{dash.description || 'No description provided.'}</p>
            </Card>
          ))}
          
          {dashboards.length === 0 && (
            <div className="col-span-full">
              <Card className="p-12 text-center text-muted">
                No dashboards found. {canCreate && 'Create one to get started.'}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
