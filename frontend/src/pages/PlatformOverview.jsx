import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  Box, Server, Users, Activity, 
  RefreshCw, Shield, Zap, Database, Globe,
  CheckCircle2, ArrowRight, ShieldAlert,
  FolderOpen
} from 'lucide-react';
import { getPlatformStats, getHealth } from '../api/client';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';

export default function PlatformOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, healthRes] = await Promise.all([
        getPlatformStats(),
        getHealth().catch(() => ({ status: 'error' }))
      ]);
      setStats(statsRes.stats);
      setHealthStatus(healthRes);
    } catch (err) {
      console.error(err);
      setError('Unable to reach platform infrastructure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const isHealthy = healthStatus?.status === 'ok';

  if (error) {
    return (
      <div className="flex-align" style={{ height: '100%', minHeight: '60vh', justifyContent: 'center' }}>
        <div style={{ 
          maxWidth: '440px', padding: '3rem 2.5rem', textAlign: 'center',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <ShieldAlert size={48} className="text-red mb-4" style={{ margin: '0 auto', opacity: 0.8 }} />
          <h3 className="font-bold text-xl mb-2 text-main">Infrastructure Unreachable</h3>
          <p className="text-muted text-sm mb-6">{error}</p>
          <button className="ds-btn" style={{ margin: '0 auto', padding: '0.6rem 1.5rem' }} onClick={fetchDashboardData}>
            <RefreshCw size={16} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const customStyles = `
    .stat-card-premium {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    .stat-card-premium:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .stat-card-premium::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
    }
    .stat-ws::after { background: var(--blue); }
    .stat-app::after { background: var(--green); }
    .stat-usr::after { background: var(--purple); }
    .stat-dev::after { background: var(--orange); }
    
    .tab-button {
      padding: 0.75rem 1.5rem;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .tab-button.active {
      color: var(--blue);
      border-bottom-color: var(--blue);
    }
    .tab-button:hover:not(.active) {
      color: var(--text-main);
      background: rgba(0,0,0,0.02);
    }
  `;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      <style>{customStyles}</style>

      {/* Header */}
      <div className="flex-between mb-8 flex-wrap gap-4 mt-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-main tracking-tight flex-align gap-3">
            <Shield size={24} className="text-blue" />
            Platform Control Center
          </h1>
          <p className="text-muted text-sm">
            Global infrastructure overview and metrics.
          </p>
        </div>
        
        <button className="ds-btn" onClick={fetchDashboardData} disabled={loading} style={{ 
          backgroundColor: 'white', 
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
          padding: '0.5rem 1rem',
          fontSize: '0.85rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            {/* Workspaces */}
            <div className="stat-card-premium stat-ws">
              <div className="flex-align gap-3 mb-4">
                <div className="ds-icon-box bg-blue-light text-blue" style={{ borderRadius: 'var(--radius-md)' }}>
                  <FolderOpen size={20} strokeWidth={2} />
                </div>
                <div className="text-sm font-bold text-main" style={{ letterSpacing: '0.02em' }}>Total Workspaces</div>
              </div>
              <div className="mt-auto">
                <div className="font-bold text-main" style={{ fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.025em' }}>
                  {stats?.workspaces ?? 0}
                </div>
                <div className="text-xs font-medium text-muted mt-2 text-uppercase" style={{ letterSpacing: '0.05em' }}>Active tenants</div>
              </div>
            </div>

            {/* Applications */}
            <div className="stat-card-premium stat-app">
              <div className="flex-align gap-3 mb-4">
                <div className="ds-icon-box bg-green-light text-green" style={{ borderRadius: 'var(--radius-md)' }}>
                  <Box size={20} strokeWidth={2} />
                </div>
                <div className="text-sm font-bold text-main" style={{ letterSpacing: '0.02em' }}>Total Applications</div>
              </div>
              <div className="mt-auto">
                <div className="font-bold text-main" style={{ fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.025em' }}>
                  {stats?.applications ?? 0}
                </div>
                <div className="text-xs font-medium text-muted mt-2 text-uppercase" style={{ letterSpacing: '0.05em' }}>Deployed apps</div>
              </div>
            </div>

            {/* Users */}
            <div className="stat-card-premium stat-usr">
              <div className="flex-align gap-3 mb-4">
                <div className="ds-icon-box bg-purple-light text-purple" style={{ borderRadius: 'var(--radius-md)' }}>
                  <Users size={20} strokeWidth={2} />
                </div>
                <div className="text-sm font-bold text-main" style={{ letterSpacing: '0.02em' }}>Total Users</div>
              </div>
              <div className="mt-auto">
                <div className="font-bold text-main" style={{ fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.025em' }}>
                  {stats?.users ?? 0}
                </div>
                <div className="text-xs font-medium text-muted mt-2 text-uppercase" style={{ letterSpacing: '0.05em' }}>Registered users</div>
              </div>
            </div>

            {/* Devices */}
            <div className="stat-card-premium stat-dev">
              <div className="flex-align gap-3 mb-4">
                <div className="ds-icon-box bg-orange-light text-orange" style={{ borderRadius: 'var(--radius-md)' }}>
                  <Server size={20} strokeWidth={2} />
                </div>
                <div className="text-sm font-bold text-main" style={{ letterSpacing: '0.02em' }}>Total Devices</div>
              </div>
              <div className="mt-auto">
                <div className="font-bold text-main" style={{ fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.025em' }}>
                  {stats?.devices?.total ?? 0}
                </div>
                <div className="text-xs font-medium text-muted mt-2 text-uppercase" style={{ letterSpacing: '0.05em' }}>Endpoints managed</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
