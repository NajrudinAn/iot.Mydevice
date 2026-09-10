import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import RoutesTab from '../components/apis/RoutesTab';
import ApisTab from '../components/apis/ApisTab';
import { BookOpen, Share2, Package } from 'lucide-react';

const WorkspaceApis = () => {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'routes';

    const handleTabChange = (tab) => {
        setSearchParams({ tab });
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full bg-white min-h-[500px]">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 1.875rem)', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '0.375rem', lineHeight: 1.1 }}>API Management</h1>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>Manage reusable API routes and package them into secure APIs.</p>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', fontWeight: 500, fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <BookOpen size={16} />
                        <span>API Documentation</span>
                    </button>
                </div>

                <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '10px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <button
                        onClick={() => handleTabChange('routes')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 18px', borderRadius: '7px', fontSize: '0.875rem', fontWeight: 500,
                            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                            background: activeTab === 'routes' ? '#fff' : 'transparent',
                            color: activeTab === 'routes' ? '#3b82f6' : '#64748b',
                            boxShadow: activeTab === 'routes' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        }}
                    >
                        <Share2 size={15} />
                        <span>Routes</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('apis')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 18px', borderRadius: '7px', fontSize: '0.875rem', fontWeight: 500,
                            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                            background: activeTab === 'apis' ? '#fff' : 'transparent',
                            color: activeTab === 'apis' ? '#3b82f6' : '#64748b',
                            boxShadow: activeTab === 'apis' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        }}
                    >
                        <Package size={15} />
                        <span>APIs</span>
                    </button>
                </div>
            </div>
        </div>

            <div className="w-full">
                {activeTab === 'routes' && <RoutesTab workspaceId={workspaceId} />}
                {activeTab === 'apis' && <ApisTab workspaceId={workspaceId} onSelectApi={(apiId) => navigate(`/workspaces/${workspaceId}/apis/${apiId}`)} />}
            </div>
        </div>
    );
};

export default WorkspaceApis;
