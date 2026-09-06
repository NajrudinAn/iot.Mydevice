import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appClient } from '../api/client';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { Plus, Save, ArrowLeft, Eye, Edit, Settings } from 'lucide-react';
import WidgetConfigModal from '../components/WidgetConfigModal';
import WidgetRenderer from '../components/widgets/WidgetRenderer';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import Card from '../components/ui/Card';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardBuilder() {
  const { applicationId, dashboardId } = useParams();
  const [dashboard, setDashboard] = useState(null);
  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [layout, setLayout] = useState([]);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const navigate = useNavigate();

  const [isEditMode, setIsEditMode] = useState(true);
  const [dashboardData, setDashboardData] = useState({});
  const [globalTimeRange, setGlobalTimeRange] = useState('');

  const fetchDashboardData = async () => {
    try {
      const res = await appClient.get(`/applications/${applicationId}/dashboards/${dashboardId}/view`);
      setDashboard(res.data.dashboard);
      setPages(res.data.pages);
      
      if (res.data.pages.length > 0) {
        const pageToLoad = activePageId ? res.data.pages.find(p => p.id === activePageId) : res.data.pages[0];
        
        if (pageToLoad) {
          setActivePageId(pageToLoad.id);
          setWidgets(pageToLoad.widgets);
          
          const rglLayout = pageToLoad.widgets.map(w => ({
            i: w.id,
            x: w.position_x || 0,
            y: w.position_y || 0,
            w: w.width || 4,
            h: w.height || 4,
          }));
          setLayout(rglLayout);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard view", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTelemetryData = async () => {
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
    fetchDashboardData();
  }, [applicationId, dashboardId]);

  useEffect(() => {
    if (!isEditMode && !loading && dashboard) {
      fetchTelemetryData();
      const interval = setInterval(fetchTelemetryData, 5000);
      return () => clearInterval(interval);
    }
  }, [isEditMode, loading, dashboard, applicationId, dashboardId, globalTimeRange]);

  const handleCreatePage = async () => {
    const name = prompt("Page Name:");
    if (!name) return;
    try {
      await appClient.post(`/applications/${applicationId}/dashboards/${dashboardId}/pages`, {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        position: pages.length + 1
      });
      fetchDashboardData();
    } catch (e) {
      alert("Failed to create page");
    }
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  const saveLayout = async () => {
    if (!activePageId) return;
    try {
      for (const item of layout) {
        await appClient.patch(`/applications/${applicationId}/dashboards/${dashboardId}/pages/${activePageId}/widgets/${item.i}`, {
          position_x: item.x,
          position_y: item.y,
          width: item.w,
          height: item.h
        });
      }
      alert("Layout saved!");
    } catch (e) {
      console.error(e);
      alert("Failed to save layout.");
    }
  };

  if (loading) return <div className="h-full flex-center"><Spinner size={48} /></div>;

  return (
    <div className="flex flex-column h-full p-6">
      <div className="flex-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="icon" onClick={() => navigate('../')}><ArrowLeft size={20}/></Button>
          <div>
            <h1 className="text-2xl font-bold">{dashboard?.title || dashboard?.name}</h1>
            <p className="text-muted text-sm">{isEditMode ? 'Builder Mode' : 'Preview Mode'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!isEditMode && (
            <Select 
              value={globalTimeRange} 
              onChange={e => setGlobalTimeRange(e.target.value)}
              className="w-48 !mb-0"
            >
              <option value="">Default Time Range</option>
              <option value="LAST_5_MINUTES">Last 5 Minutes</option>
              <option value="LAST_15_MINUTES">Last 15 Minutes</option>
              <option value="LAST_1_HOUR">Last 1 Hour</option>
              <option value="LAST_6_HOURS">Last 6 Hours</option>
              <option value="LAST_24_HOURS">Last 24 Hours</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
            </Select>
          )}
          
          <Button 
            variant="secondary" 
            onClick={() => setIsEditMode(!isEditMode)}
            icon={isEditMode ? Eye : Edit}
          >
            {isEditMode ? 'Preview' : 'Edit'}
          </Button>
          
          {isEditMode && (
            <Button onClick={saveLayout} icon={Save}>Save Layout</Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10 mb-6 pb-2 overflow-x-auto">
        {pages.map(p => (
          <button 
            key={p.id}
            onClick={() => {
              setActivePageId(p.id);
              setWidgets(p.widgets);
              setLayout(p.widgets.map(w => ({ i: w.id, x: w.position_x||0, y: w.position_y||0, w: w.width||4, h: w.height||4 })));
            }}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              activePageId === p.id 
                ? 'bg-primary/20 text-primary' 
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {p.name}
          </button>
        ))}
        {isEditMode && (
          <Button variant="ghost" onClick={handleCreatePage} size="sm" icon={Plus}>Add Page</Button>
        )}
      </div>

      <div className="flex-1 bg-surface border border-white/10 rounded-xl p-4 min-h-[600px] overflow-y-auto">
        <div className="flex-between mb-4">
          <h3 className="font-semibold">Widgets</h3>
          {activePageId && isEditMode && (
            <Button onClick={() => setShowWidgetModal(true)} icon={Plus} size="sm">
              Add Widget
            </Button>
          )}
        </div>
        
        {activePageId ? (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={40}
            onLayoutChange={handleLayoutChange}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            margin={[16, 16]}
          >
            {layout.map((itm) => {
              const widget = widgets.find(w => w.id === itm.i);
              return (
                <div key={itm.i} className="glass-card flex flex-column overflow-hidden group">
                  <div className="font-semibold border-b border-white/5 py-2 px-4 bg-white/5 flex-between cursor-move">
                    <span className="truncate">{widget?.title}</span>
                    {isEditMode && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="icon" size="sm"><Settings size={14} /></Button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 relative overflow-auto flex-column p-4">
                    {isEditMode ? (
                      <div className="flex-1 flex-center text-muted border-2 border-dashed border-white/10 rounded-lg">
                        {widget?.widget_type} (Edit Mode)
                      </div>
                    ) : (
                      <WidgetRenderer widget={widget} widgetData={dashboardData[itm.i]} />
                    )}
                  </div>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        ) : (
          <div className="text-center text-muted p-12">
            Create or select a page to add widgets.
          </div>
        )}
      </div>

      {showWidgetModal && activePageId && isEditMode && (
        <WidgetConfigModal 
          onClose={() => setShowWidgetModal(false)} 
          onSuccess={() => { setShowWidgetModal(false); fetchDashboardData(); }}
          pageId={activePageId}
          dashboardId={dashboardId}
          applicationId={applicationId}
        />
      )}
    </div>
  );
}
