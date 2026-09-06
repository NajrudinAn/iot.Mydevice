import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, Box, Users, Server, Search, RefreshCw, AlertCircle, LayoutGrid, List, ChevronRight, Activity, Grid, Plus, X
} from 'lucide-react';
import { getPlatformStats, getPlatformWorkspaces, getPlatformApplications, platformClient } from '../api/client';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import Button from '../components/ui/Button';

export default function PlatformWorkspaces() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('workspaces');
  const [viewMode, setViewMode] = useState('grid');
  
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes] = await Promise.all([
        getPlatformStats()
      ]);
      setStats(statsRes.stats);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while retrieving data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex-align" style={{ height: '100%', minHeight: '400px', justifyContent: 'center' }}>
        <div className="ds-card text-center" style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
          <AlertCircle size={32} className="text-red mb-4" style={{ margin: '0 auto' }} />
          <h3 className="font-bold text-lg mb-2">Unable to load data</h3>
          <p className="text-muted text-sm mb-6">{error}</p>
          <button className="ds-btn" style={{ margin: '0 auto' }} onClick={fetchData}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ letterSpacing: '-0.025em', color: 'var(--text-main)' }}>Workspaces & Applications</h1>
          <p className="text-muted" style={{ fontSize: '0.95rem' }}>View and manage all workspaces and applications on the MyDevice platform.</p>
        </div>
        <div className="flex-align gap-3">
          <button className="ds-btn ds-btn-outline" onClick={fetchData} style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="font-medium">Refresh</span>
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {loading ? (
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <style>{`
              .stat-card-hover { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease; }
              .stat-card-hover:hover { transform: translateY(-4px); box-shadow: var(--shadow-glow); z-index: 10; }
              .stat-card-inner { padding: 1.5rem; display: flex; flex-direction: column; }
              .stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
              
              .list-table { width: 100%; border-collapse: separate; border-spacing: 0 0.75rem; }
              .list-table th { padding: 0 1.5rem; font-weight: 600; text-align: left; color: var(--text-muted); font-size: 0.85rem; border-bottom: none; }
              .list-table td { padding: 1rem 1.5rem; background: white; }
              .list-row td:first-child { border-radius: var(--radius-lg) 0 0 var(--radius-lg); border-left: 1px solid var(--border-color); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
              .list-row td { border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
              .list-row td:last-child { border-radius: 0 var(--radius-lg) var(--radius-lg) 0; border-right: 1px solid var(--border-color); }
              .list-row:hover td { border-color: var(--blue-light); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
              
              @media (max-width: 1024px) {
                .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
                .stat-card-inner { padding: 1.25rem 1rem; }
              }
              @media (max-width: 640px) {
                .stat-grid { grid-template-columns: 1fr; }
                .filters-row { flex-direction: column !important; align-items: stretch !important; }
                .filters-controls { justify-content: flex-start !important; flex-wrap: wrap; }
                .search-input-container { max-width: 100% !important; }
                .list-table th { font-size: 0.75rem; padding: 0 0.75rem; }
                .list-table td { font-size: 0.85rem; padding: 0.75rem; }
              }
            `}</style>
            
            {/* Stat Card 1 */}
            <div className="ds-card stat-card-hover stat-card-inner" style={{ borderBottom: '4px solid #3b82f6' }}>
              <div className="flex-align gap-3 mb-3">
                <div className="ds-icon-box bg-blue-light text-blue" style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-md)' }}>
                  <LayoutGrid size={16} strokeWidth={2} />
                </div>
                <div className="text-sm font-bold text-main" style={{ lineHeight: 1.2 }}>Total Workspaces</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
                <div className="font-bold" style={{ fontSize: '1.75rem', lineHeight: 1, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>{stats?.workspaces ?? 0}</div>
                <div className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>Active environments</div>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="ds-card stat-card-hover stat-card-inner" style={{ borderBottom: '4px solid #10b981' }}>
              <div className="flex-align gap-3 mb-3">
                <div className="ds-icon-box bg-green-light text-green" style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-md)' }}>
                  <Box size={16} strokeWidth={2} />
                </div>
                <div className="text-sm font-bold text-main" style={{ lineHeight: 1.2 }}>Total Applications</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
                <div className="font-bold" style={{ fontSize: '1.75rem', lineHeight: 1, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>{stats?.applications ?? 0}</div>
                <div className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>Deployed across platform</div>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="ds-card stat-card-hover stat-card-inner" style={{ borderBottom: '4px solid #a855f7' }}>
              <div className="flex-align gap-3 mb-3">
                <div className="ds-icon-box bg-purple-light text-purple" style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-md)' }}>
                  <Users size={16} strokeWidth={2} />
                </div>
                <div className="text-sm font-bold text-main" style={{ lineHeight: 1.2 }}>Total Users</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
                <div className="font-bold" style={{ fontSize: '1.75rem', lineHeight: 1, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>{stats?.users ?? 0}</div>
                <div className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>Registered across all tenants</div>
              </div>
            </div>

            {/* Stat Card 4 */}
            <div className="ds-card stat-card-hover stat-card-inner" style={{ borderBottom: '4px solid #f59e0b' }}>
              <div className="flex-align gap-3 mb-3">
                <div className="ds-icon-box bg-orange-light text-orange" style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-md)' }}>
                  <Server size={16} strokeWidth={2} />
                </div>
                <div className="text-sm font-bold text-main" style={{ lineHeight: 1.2 }}>Total Devices</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
                <div className="font-bold" style={{ fontSize: '1.75rem', lineHeight: 1, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>{stats?.devices?.total ?? 0}</div>
                <div className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>Provisioned endpoints</div>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
