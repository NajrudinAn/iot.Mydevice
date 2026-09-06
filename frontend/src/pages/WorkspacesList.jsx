import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformClient } from '../api/client';
import { LayoutGrid, FolderPlus, ArrowRight, Activity, Cpu, AppWindow } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function WorkspacesList() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await platformClient.get('/workspaces');
        setWorkspaces(res.data.workspaces);
      } catch (err) {
        console.error("Failed to load workspaces", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  if (loading) {
    return <div className="h-full flex-center"><Spinner size={48} /></div>;
  }

  return (
    <div>
      <PageHeader 
        title="Your Workspaces" 
        description="Select a workspace to manage your IoT applications and devices."
        action={
          <Button onClick={() => alert('Create workspace modal not implemented yet')} icon={FolderPlus}>
            New Workspace
          </Button>
        }
      />

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 flex items-center gap-4 border-t-4 border-t-primary">
          <div className="bg-primary/20 p-4 rounded-full text-primary">
            <LayoutGrid size={24} />
          </div>
          <div>
            <p className="text-muted text-sm uppercase tracking-wide font-semibold">Total Workspaces</p>
            <p className="text-3xl font-bold mt-1">{workspaces.length}</p>
          </div>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mb-4">All Workspaces</h2>
      
      {workspaces.length === 0 ? (
        <EmptyState 
          title="No Workspaces Found" 
          description="You don't belong to any workspaces yet. Create one to get started." 
          icon={LayoutGrid}
          action={<Button icon={FolderPlus}>Create Workspace</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map(ws => (
            <Card 
              key={ws.id} 
              className="p-6 flex flex-column cursor-pointer group"
              onClick={() => navigate(`/workspaces/${ws.id}/applications`)}
            >
              <div className="flex-between mb-4">
                <div className="bg-primary-transparent p-3 rounded-lg text-primary">
                  <LayoutGrid size={24} />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight size={20} className="text-muted" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1">{ws.name}</h3>
              <p className="text-sm text-muted mb-4 font-mono">{ws.id}</p>
              
              <div className="mt-auto pt-4 border-t border-white/5 flex gap-4 text-sm text-muted">
                <span className="flex items-center gap-1"><AppWindow size={14} /> Apps</span>
                <span className="flex items-center gap-1"><Cpu size={14} /> Devices</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
