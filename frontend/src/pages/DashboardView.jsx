import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appClient } from '../api/client';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { ArrowLeft, Edit } from 'lucide-react';
import WidgetRenderer from '../components/widgets/WidgetRenderer';
import { useApplicationAuth } from '../context/ApplicationAuthContext';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardView() {
  const { applicationId, dashboardId } = useParams();
  const [dashboard, setDashboard] = useState(null);
  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [layout, setLayout] = useState([]);
  const navigate = useNavigate();
  const { appUser } = useApplicationAuth();

  const [dashboardData, setDashboardData] = useState({});
  const [globalTimeRange, setGlobalTimeRange] = useState('');

  const fetchDashboardView = async () => {
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
      }
    } catch (err) {
      console.error("Failed to load dashboard view", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
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
    fetchDashboardView();
  }, [applicationId, dashboardId]);

  useEffect(() => {
    if (!loading && dashboard) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 5000);
      return () => clearInterval(interval);
    }
  }, [loading, dashboard, applicationId, dashboardId, globalTimeRange]);

  if (loading) return <div className="h-full flex-center"><Spinner size={48} /></div>;

  return (
    <div className="flex flex-column h-full p-6">
      <div className="flex-between mb-6">
        <div className="flex items-center gap-4">
          {appUser?.loggedIn && <Button variant="icon" onClick={() => navigate('../')}><ArrowLeft size={20}/></Button>}
          <h1 className="text-2xl font-bold">{dashboard?.title || dashboard?.name}</h1>
          {dashboard?.is_public && <Badge variant="success">PUBLIC</Badge>}
        </div>
        <div className="flex items-center gap-4">
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
          {appUser?.loggedIn && appUser?.role !== 'VIEWER' && (
            <Button variant="secondary" icon={Edit} onClick={() => navigate(`../${dashboardId}/edit`)}>
              Edit Dashboard
            </Button>
          )}
        </div>
      </div>

      {pages.length > 1 && (
        <div className="flex gap-2 border-b border-white/10 mb-6 pb-2 overflow-x-auto">
          {pages.map(p => (
            <button 
              key={p.id}
              onClick={() => {
                setActivePageId(p.id);
                setWidgets(p.widgets);
                setLayout(p.widgets.map(w => ({ i: w.id, x: w.position_x||0, y: w.position_y||0, w: w.width||4, h: w.height||4, static: true })));
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
        </div>
      )}

      <div className="flex-1 bg-surface border border-white/10 rounded-xl p-4 min-h-[600px] overflow-y-auto">
        {activePageId ? (
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
          <div className="text-center text-muted p-12">
            No pages available.
          </div>
        )}
      </div>
    </div>
  );
}
