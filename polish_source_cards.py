with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

# Polish the Data Sources header and cards
old_sources_block = """        <div className="mt-8">
            <div className="flex-between align-center mb-6">
                <h2 className="text-lg font-bold text-main flex-align gap-2">
                    <Database size={20} className="text-blue" /> Data Sources
                </h2>
                <Button variant="outline" onClick={() => navigate(`/workspaces/${workspaceId}/data/${deviceId}/source/All`)} className="flex-align gap-2 border-slate-300">
                    <Layers size={16} className="text-slate-500" />
                    <span className="font-medium text-slate-700">View All Data</span>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {sourceKeys.map(src => (
                    <div 
                        key={src} 
                        className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-blue/40 group flex flex-col"
                        onClick={() => navigate(`/workspaces/${workspaceId}/data/${deviceId}/source/${src}`)}
                    >
                        <div className="flex-between mb-3">
                            <h3 className="font-bold text-lg capitalize text-main group-hover:text-blue transition-colors flex-align gap-2">
                                {src}
                            </h3>
                            <div 
                                className="bg-slate-50 text-slate-500 text-xs font-semibold rounded-md border border-slate-100 flex items-center justify-center shrink-0"
                                style={{ padding: '0.25rem 0.625rem', lineHeight: 1 }}
                            >
                                {sourcesMap[src].length} fields
                            </div>
                        </div>
                        
                        <div className="flex-1">
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                {sourcesMap[src].slice(0, 3).map(f => f.display_name || f.field_name.split('.').pop()).join(' • ')}
                                {sourcesMap[src].length > 3 && ' • ...'}
                            </p>
                        </div>
                        
                        <div className="mt-auto pt-4 border-t border-gray-50 flex-between align-center">
                            <span className="text-xs font-medium text-slate-400">
                                Click to view telemetry
                            </span>
                            <span className="text-blue opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-sm font-semibold">
                                View <ChevronLeft size={16} className="rotate-180 ml-1" />
                            </span>
                        </div>
                    </div>
                ))}
            </div>"""

new_sources_block = """        <div className="mt-8">
            <div className="flex-between align-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue/10 flex-center text-blue shadow-sm">
                        <Database size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-main tracking-tight">Data Sources</h2>
                        <p className="text-xs text-muted mt-0.5">Categorized telemetry streams</p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => navigate(`/workspaces/${workspaceId}/data/${deviceId}/source/All`)} className="flex-align gap-2 border-slate-300 hover:bg-slate-50 hover:text-blue hover:border-blue/30 transition-all">
                    <Layers size={16} className="text-blue" />
                    <span className="font-medium">View All Data</span>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sourceKeys.map(src => {
                    const fieldCount = sourcesMap[src].length;
                    
                    return (
                        <div 
                            key={src} 
                            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-blue/50 group flex flex-col relative overflow-hidden"
                            onClick={() => navigate(`/workspaces/${workspaceId}/data/${deviceId}/source/${src}`)}
                        >
                            {/* Accent Glow */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue/5 rounded-full blur-2xl group-hover:bg-blue/10 transition-colors"></div>
                            
                            <div className="flex-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex-center text-slate-400 group-hover:bg-blue group-hover:text-white transition-colors group-hover:border-blue">
                                        <Activity size={16} />
                                    </div>
                                    <h3 className="font-bold text-lg capitalize text-main group-hover:text-blue transition-colors">
                                        {src}
                                    </h3>
                                </div>
                                <div 
                                    className="bg-slate-50 text-slate-500 text-xs font-semibold rounded-md border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue/5 group-hover:text-blue group-hover:border-blue/20 transition-colors"
                                    style={{ padding: '0.25rem 0.625rem', lineHeight: 1 }}
                                >
                                    {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                                </div>
                            </div>
                            
                            <div className="flex-1 relative z-10">
                                <p className="text-sm font-medium text-slate-500 leading-relaxed mb-4">
                                    {sourcesMap[src].slice(0, 3).map(f => f.display_name || f.field_name.split('.').pop().replace(/_/g, ' ')).join(' • ')}
                                    {sourcesMap[src].length > 3 && <span className="opacity-50"> • ...</span>}
                                </p>
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-gray-100 flex-between align-center relative z-10">
                                <span className="text-xs font-medium text-slate-400 group-hover:text-blue/70 transition-colors">
                                    View telemetry
                                </span>
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex-center text-slate-400 group-hover:bg-blue group-hover:text-white transition-all transform group-hover:translate-x-1">
                                    <ChevronLeft size={16} className="rotate-180" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>"""

content = content.replace(old_sources_block, new_sources_block)

with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Polished Source Cards.")
