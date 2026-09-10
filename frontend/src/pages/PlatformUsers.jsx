import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, RefreshCw } from 'lucide-react';
import { getPlatformUsers, promotePlatformUser, demotePlatformUser } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SkeletonCard } from '../components/ui/Skeleton';
import Button from '../components/ui/Button';

export default function PlatformUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [promoting, setPromoting] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPlatformUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch platform users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePromote = async (userId) => {
    if (!window.confirm("Are you sure you want to promote this user to Platform Admin?")) return;
    setPromoting(userId);
    try {
      await promotePlatformUser(userId);
      await fetchUsers(); // Refresh the list
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to promote user.');
    } finally {
      setPromoting(null);
    }
  };

  const handleDemote = async (userId) => {
    if (!window.confirm("Are you sure you want to demote this admin to a standard user?")) return;
    setPromoting(userId);
    try {
      await demotePlatformUser(userId);
      await fetchUsers(); // Refresh the list
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to demote user.');
    } finally {
      setPromoting(null);
    }
  };

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
          <h3 className="font-bold text-xl mb-2 text-main">Failed to load users</h3>
          <p className="text-muted text-sm mb-6">{error}</p>
          <button className="ds-btn" style={{ margin: '0 auto', padding: '0.6rem 1.5rem' }} onClick={fetchUsers}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div className="flex-between mb-8 flex-wrap gap-4 mt-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-main tracking-tight flex-align gap-3">
            <Shield size={24} className="text-blue" />
            Platform Users
          </h1>
          <p className="text-muted text-sm">
            Manage all users registered across the MyDevice platform.
          </p>
        </div>
        
        <button className="ds-btn" onClick={fetchUsers} disabled={loading} style={{ 
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

      <div className="glass-card p-0 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex-between">
          <h2 className="text-xl font-bold text-main">All Users</h2>
          <div className="text-sm text-muted font-medium bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
            {users.length} Users Total
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-muted text-sm border-b border-gray-100">
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex-align gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue text-white flex-center font-bold text-sm">
                          {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-main">{u.name || 'Unknown User'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.is_platform_admin ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-light text-purple">
                          <Shield size={12} /> Platform Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-muted">
                          Standard User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!u.is_platform_admin && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handlePromote(u.id)}
                          loading={promoting === u.id}
                          disabled={promoting !== null}
                        >
                          Promote to Admin
                        </Button>
                      )}
                      {u.is_platform_admin && u.id !== currentUser?.id && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDemote(u.id)}
                          loading={promoting === u.id}
                          disabled={promoting !== null}
                          style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
                        >
                          Demote from Admin
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-muted">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
