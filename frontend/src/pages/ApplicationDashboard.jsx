import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { appClient } from '../api/client';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { LayoutDashboard, Plus, Edit, ArrowRight, Hexagon, Activity } from 'lucide-react';
import WidgetRenderer from '../components/widgets/WidgetRenderer';
import { useApplicationAuth } from '../context/ApplicationAuthContext';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function ApplicationDashboard() {
  const { applicationId, applicationSlug, dashboardId } = useParams();
  const navigate = useNavigate();
  const { appUser, authSettings } = useApplicationAuth();
  
  // Dashboard List State
  const [dashboards, setDashboards] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  
  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [newDashName, setNewDashName] = useState('');
  const [newDashSlug, setNewDashSlug] = useState('');
  const [newDashVisibility, setNewDashVisibility] = useState('PRIVATE');
  const [saving, setSaving] = useState(false);
  
  // Current Dashboard State
  const [dashboard, setDashboard] = useState(null);
  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [layout, setLayout] = useState([]);
  const [dashboardData, setDashboardData] = useState({});
  const [globalTimeRange, setGlobalTimeRange] = useState('');
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [errorDashboard, setErrorDashboard] = useState(false);

  const basePath = applicationSlug ? `/app/${applicationSlug}` : `/applications/${applicationId}`;
  const canCreateOrEdit = appUser?.loggedIn && appUser?.role !== 'VIEWER';

  // Fetch Dashboard List
  const fetchDashboards = async () => {
    try {
      const res = await appClient.get(`/applications/${applicationId}/dashboards`);
      setDashboards(res.data.dashboards);
    } catch (err) {
      console.error("Failed to load dashboards", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, [applicationId]);

  // Handle Create
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

  // Fetch Current Dashboard View
  const fetchDashboardView = async () => {
    if (!dashboardId) {
      setDashboard(null);
      setPages([]);
      setWidgets([]);
      setLayout([]);
      return;
    }
    
    setLoadingDashboard(true);
    setErrorDashboard(false);
    
    try {
      const res = await appClient.get(`/applications/${applicationId}/dashboards/${dashboardId}/view`);
      setDashboard(res.data.dashboard);
      setPages(res.data.pages);
      
      if (res.data.pages.length > 0) {
        const defaultPage = res.data.pages[0];
        setActivePageId(defaultPage.id);
        setWidgets(defaultPage.widgets);
        
        const rglLayout = defaultPage.widgets.map(w => ({
          i: w.id,
          x: w.position_x || 0,
          y: w.position_y || 0,
          w: w.width || 4,
          h: w.height || 4,
          static: true 
        }));
        setLayout(rglLayout);
      } else {
        setActivePageId(null);
        setWidgets([]);
        setLayout([]);
      }
    } catch (err) {
      console.error("Failed to load dashboard view", err);
      setErrorDashboard(true);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    fetchDashboardView();
  }, [applicationId, dashboardId]);

  // Fetch Telemetry Data
  const fetchDashboardData = async () => {
    if (!dashboardId || !dashboard) return;
    try {
      let url = `/applications/${applicationId}/dashboards/${dashboardId}/data`;
      if (globalTimeRange) {
        url += `?time_range=${globalTimeRange}`;
      }
      const res = await appClient.get(url);
      if (res.data && res.data.widgets) {
        setDashboardData(res.data.widgets);
      }
    } catch (err) {
      console.error("Failed to load dashboard telemetry data", err);
    }
  };

  useEffect(() => {
    if (!loadingDashboard && dashboard) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 5000);
      return () => clearInterval(interval);
    }
  }, [loadingDashboard, dashboard, applicationId, dashboardId, globalTimeRange]);

  return (
    <div className="flex flex-column h-full overflow-y-auto">
      {/* 1. APPLICATION HEADER */}
      <div className="bg-surface border-b border-white/10 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex-center flex-shrink-0 overflow-hidden">
            {authSettings?.logo_url ? (
              <img src={authSettings.logo_url} alt="App Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Hexagon className="text-primary" size={32} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{authSettings?.display_name || 'Application Dashboard'}</h1>
            <p className="text-muted mt-1 max-w-2xl">
              Monitor your connected devices and data. Select a dashboard below to view real-time telemetry.
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full flex-1 flex flex-column">
        {/* 2. DASHBOARD LIST */}
        <div className="mb-8">
          <div className="flex-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <LayoutDashboard size={18} className="text-primary" />
              Available Dashboards
            </h2>
            {canCreateOrEdit && (
              <Button icon={Plus} size="sm" onClick={() => setShowModal(true)}>
                New Dashboard
              </Button>
            )}
          </div>

          {loadingList ? (
            <Card className="p-8 text-center text-muted">
              <Spinner size={24} className="mx-auto mb-2" />
              Loading dashboards...
            </Card>
          ) : dashboards.length === 0 ? (
            <Card className="p-8 text-center text-muted flex-column flex-center gap-3">
              <Activity size={32} className="text-white/20" />
              <div>No dashboards yet</div>
              {canCreateOrEdit && <div className="text-sm">Create a dashboard to visualize your device data.</div>}
            </Card>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
              {dashboards.map(dash => {
                const isActive = dash.id === dashboardId;
                return (
                  <Card 
                    key={dash.id} 
                    className={`p-4 min-w-[280px] max-w-[320px] flex-shrink-0 cursor-pointer transition-colors snap-start flex flex-column justify-between ${isActive ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => navigate(`${basePath}/dashboards/${dash.id}/view`)}
                  >
                    <div className="flex-between mb-2">
                      <h3 className="font-semibold truncate pr-2">{dash.name}</h3>
                      {isActive && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs">
                      <div className="flex gap-2">
                        <Badge variant={dash.visibility === 'PUBLIC' ? 'success' : 'neutral'} size="sm">
                          {dash.visibility}
                        </Badge>
                      </div>
                      <span className="text-muted flex items-center gap-1 group-hover:text-primary transition-colors">
                        View <ArrowRight size={12} />
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. CURRENT DASHBOARD */}
        <div className="flex-1 flex flex-column min-h-[500px]">
          {loadingDashboard ? (
            <Card className="flex-1 flex-center flex-column text-muted gap-4">
              <Spinner size={32} />
              Loading dashboard content...
            </Card>
          ) : errorDashboard ? (
            <Card className="flex-1 flex-center flex-column text-muted gap-4">
              <div className="text-red-400">Couldn't load the dashboard.</div>
              <Button onClick={fetchDashboardView} variant="secondary" size="sm">Retry</Button>
            </Card>
          ) : dashboardId && dashboard ? (
            <div className="flex flex-column h-full">
              <div className="flex-between mb-4 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{dashboard.title || dashboard.name}</h2>
                  {dashboard.is_public && <Badge variant="success" size="sm">PUBLIC</Badge>}
                </div>
                
                <div className="flex items-center gap-3">
                  <Select 
                    value={globalTimeRange} 
                    onChange={e => setGlobalTimeRange(e.target.value)}
                    className="w-40 !mb-0"
                  >
                    <option value="">Default Time</option>
                    <option value="LAST_1_HOUR">1H</option>
                    <option value="LAST_6_HOURS">6H</option>
                    <option value="LAST_24_HOURS">24H</option>
                    <option value="LAST_7_DAYS">7D</option>
                  </Select>
                  
                  {canCreateOrEdit && (
                    <Button variant="secondary" size="sm" icon={Edit} onClick={() => navigate(`../${dashboardId}/edit`)}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              {pages.length > 1 && (
                <div className="flex gap-2 border-b border-white/10 mb-4 pb-2 overflow-x-auto">
                  {pages.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => {
                        setActivePageId(p.id);
                        setWidgets(p.widgets);
                        setLayout(p.widgets.map(w => ({ i: w.id, x: w.position_x||0, y: w.position_y||0, w: w.width||4, h: w.height||4, static: true })));
                      }}
                      className={`px-4 py-1.5 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${
                        activePageId === p.id 
                          ? 'bg-primary/20 text-primary' 
                          : 'text-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 bg-surface border border-white/10 rounded-xl p-4 overflow-y-auto">
                {activePageId && widgets.length > 0 ? (
                  <ResponsiveGridLayout
                    className="layout"
                    layouts={{ lg: layout }}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={40}
                    isDraggable={false}
                    isResizable={false}
                    margin={[16, 16]}
                  >
                    {layout.map((itm) => {
                      const widget = widgets.find(w => w.id === itm.i);
                      return (
                        <div key={itm.i} className="glass-card flex flex-column overflow-hidden">
                          <div className="font-semibold border-b border-white/5 py-2 px-4 bg-white/5 truncate">
                            {widget?.title}
                          </div>
                          <div className="flex-1 relative overflow-auto p-4 flex-column">
                            <WidgetRenderer widget={widget} widgetData={dashboardData[itm.i]} />
                          </div>
                        </div>
                      );
                    })}
                  </ResponsiveGridLayout>
                ) : (
                  <div className="flex-center h-full text-muted flex-column gap-2">
                    <Activity size={24} className="text-white/20" />
                    <div>No widgets configured for this page.</div>
                  </div>
                )}
              </div>
            </div>
          ) : !dashboardId && !loadingList && dashboards.length > 0 ? (
            <Card className="flex-1 flex-center flex-column text-muted border-dashed">
              <LayoutDashboard size={32} className="mb-3 text-white/20" />
              <p>Select a dashboard from the list above to view its telemetry.</p>
            </Card>
          ) : null}
        </div>
      </div>

      {/* CREATE MODAL */}
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
    </div>
  );
}
