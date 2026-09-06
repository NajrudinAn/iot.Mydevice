import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { platformClient } from '../api/client';
import { Settings, Save } from 'lucide-react';
import Button from '../components/ui/Button';

export default function WorkspaceSettings() {
    const { workspaceId } = useParams();
    const [retention, setRetention] = useState(604800);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState(null);

    const retentionOptions = [
        { label: '1 hour', value: 3600 },
        { label: '2 hours', value: 7200 },
        { label: '24 hours', value: 86400 },
        { label: '7 days', value: 604800 },
        { label: '30 days', value: 2592000 },
        { label: 'Forever', value: null }
    ];

    useEffect(() => {
        platformClient.get(`/workspaces/${workspaceId}`)
            .then(res => {
                if (res.data.success && res.data.workspace) {
                    setRetention(res.data.workspace.command_history_retention_seconds !== undefined ? res.data.workspace.command_history_retention_seconds : 604800);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [workspaceId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await platformClient.put(`/workspaces/${workspaceId}`, {
                command_history_retention_seconds: retention
            });
            if (res.data.success) {
                setMessage({ type: 'success', text: 'Settings saved successfully' });
            } else {
                setMessage({ type: 'error', text: res.data.message });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save settings' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordMessage(null);
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        if (!currentPassword || !newPassword) {
            setPasswordMessage({ type: 'error', text: 'Please fill in all fields' });
            return;
        }

        setSavingPassword(true);
        try {
            const res = await platformClient.put('/users/me/password', {
                currentPassword,
                newPassword
            });
            if (res.data.success) {
                setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            setPasswordMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password' });
        } finally {
            setSavingPassword(false);
            setTimeout(() => setPasswordMessage(null), 3000);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    return (
        <div className="w-full max-w-4xl mx-auto pb-12">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Settings size={24} className="text-blue-500" />
                    Workspace Settings
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage configuration and data retention for this workspace.</p>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Data Retention</h2>
                    <p className="text-sm text-gray-500 mt-1">Configure how long historical data is kept before automatic deletion.</p>
                </div>
                
                <div className="p-6">
                    <div className="max-w-md">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Command History Retention
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                            Determines how long command execution records are kept in the database. 
                            Note: This does not affect current device capabilities, only execution history.
                        </p>
                        <select 
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                            value={retention === null ? 'null' : retention}
                            onChange={(e) => setRetention(e.target.value === 'null' ? null : Number(e.target.value))}
                        >
                            {retentionOptions.map(opt => (
                                <option key={opt.label} value={opt.value === null ? 'null' : opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <Button 
                            variant="primary" 
                            icon={Save} 
                            onClick={handleSave} 
                            loading={saving}
                        >
                            Save Settings
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h2>
                    <p className="text-sm text-gray-500 mt-1">Update your account password securely.</p>
                </div>
                
                <div className="p-6">
                    {passwordMessage && (
                        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${passwordMessage.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                            <span className="font-medium">{passwordMessage.text}</span>
                        </div>
                    )}
                    <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Current Password
                            </label>
                            <input 
                                type="password" 
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                New Password
                            </label>
                            <input 
                                type="password" 
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Confirm New Password
                            </label>
                            <input 
                                type="password" 
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button 
                                type="submit"
                                variant="primary" 
                                icon={Save} 
                                loading={savingPassword}
                            >
                                Update Password
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
