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
            <div className="flex-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">API Management</h1>
                    <p className="text-sm text-gray-500 mb-4">Manage reusable API routes and package them into secure APIs.</p>
                    <button className="flex-align gap-2 text-blue-500 hover:text-blue-700 font-medium text-sm transition-colors">
                        <BookOpen size={16} />
                        <span>API Documentation</span>
                    </button>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl flex-align">
                    <button
                        onClick={() => handleTabChange('routes')}
                        className={`flex-align gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'routes'
                                ? 'bg-white text-blue-500 shadow-sm'
                                : 'text-slate-600 hover:bg-gray-50'
                        }`}
                    >
                        <Share2 size={16} />
                        <span>Routes</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('apis')}
                        className={`flex-align gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'apis'
                                ? 'bg-white text-blue-500 shadow-sm'
                                : 'text-slate-600 hover:bg-gray-50'
                        }`}
                    >
                        <Package size={16} />
                        <span>APIs</span>
                    </button>
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
