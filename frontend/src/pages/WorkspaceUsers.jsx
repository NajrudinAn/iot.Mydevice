import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { platformClient } from '../api/client';
import { Users, Shield, ShieldCheck, HelpCircle } from 'lucide-react';
import { SkeletonCard } from '../components/ui/Skeleton';

const getRoleBadgeClass = (role) => {
  switch(role) {
    case 'ADMIN': return 'bg-purple-100 text-purple-800 border border-purple-200';
    case 'OPERATOR': return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'VIEWER': return 'bg-gray-100 text-gray-800 border border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

export default function WorkspaceUsers() {
  const { workspaceId } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await platformClient.get(`/workspaces/${workspaceId}/users`);
        setUsers(res.data.users || []);
      } catch (err) {
        console.error("Failed to fetch workspace users", err);
        setError("Unable to load users. You might not have permission.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [workspaceId]);

  const getRoleDisplayInfo = (user) => {
    if (user.role === 'WORKSPACE_OWNER') {
      return { 
        label: 'Workspace Owner', 
        icon: <ShieldCheck size={14} className="text-blue" />,
        badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200'
      };
    }
    
    const roleName = user.application_role || 'VIEWER';
    return {
      label: roleName,
      icon: <Shield size={14} className="text-gray-500" />,
      badgeClass: getRoleBadgeClass(roleName)
    };
  };

  return (
    <div className="fade-in">
      <div className="flex-between mb-8">
        <div className="flex-align gap-3">
          <div className="ds-icon-box bg-blue-light text-blue">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-main mb-1">Users & Access</h2>
            <p className="text-sm text-muted">Manage users who have access to this workspace and its applications.</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-red-50 border border-red-100 rounded-lg text-red text-sm">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Role & Access</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Application</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><SkeletonCard className="h-10 w-full" /></td>
                      <td className="px-6 py-4"><SkeletonCard className="h-6 w-24" /></td>
                      <td className="px-6 py-4"><SkeletonCard className="h-6 w-32" /></td>
                      <td className="px-6 py-4"><SkeletonCard className="h-6 w-16" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-muted">
                      <HelpCircle size={32} className="mx-auto mb-3 text-gray-300" />
                      <p>No users found for this workspace.</p>
                    </td>
                  </tr>
                ) : (
                  users.map(user => {
                    const roleInfo = getRoleDisplayInfo(user);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex-align gap-3">
                            <div className="rounded-full bg-blue-100 text-blue flex-center font-bold text-sm" style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', flexShrink: 0 }}>
                              {user.name ? user.name.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-main">{user.name || 'Unnamed User'}</div>
                              <div className="text-xs text-muted mt-0.5">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex-align gap-2">
                            {roleInfo.icon}
                            <span className={`badge ${roleInfo.badgeClass} uppercase tracking-wider text-[10px]`}>
                              {roleInfo.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted">
                          {user.application_name ? (
                            <div className="flex-align gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              {user.application_name}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">All Workspace Access</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded-full border border-green-100">Active</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      )}
    </div>
  );
}
