with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "r") as f:
    content = f.read()

# Make leaves more compact
old_leaf = """        return (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group flex flex-col h-full">
                <div className={`absolute top-0 left-0 w-1 h-full ${level > 1 ? 'bg-purple-400/40 group-hover:bg-purple-500' : 'bg-blue/30 group-hover:bg-blue'} transition-colors`}></div>
                <div className="text-sm font-medium text-slate-500 mb-1 truncate pr-4" title={node.path}>{displayName}</div>
                <div className="text-xl font-bold text-main truncate mb-2" title={String(displayValue)}>
                    {displayValue !== null ? String(displayValue) : 'Null'}
                    {fieldMeta?.unit && <span className="text-sm text-muted font-normal ml-1.5">{fieldMeta.unit}</span>}
                </div>
                <div className="mt-auto pt-2">
                    {node.state.timestamp && (
                        <div className="text-[10px] font-medium text-slate-400">
                            Updated {new Date(node.state.timestamp).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>
        );"""

new_leaf = """        return (
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden group flex flex-col h-full">
                <div className={`absolute top-0 left-0 w-1 h-full ${level > 1 ? 'bg-purple-400/40 group-hover:bg-purple-500' : 'bg-blue/30 group-hover:bg-blue'} transition-colors`}></div>
                <div className="text-xs font-medium text-slate-500 mb-0.5 truncate pl-1.5 pr-2" title={node.path}>{displayName}</div>
                <div className="text-lg font-bold text-main truncate mb-1 pl-1.5" title={String(displayValue)}>
                    {displayValue !== null ? String(displayValue) : 'Null'}
                    {fieldMeta?.unit && <span className="text-xs text-muted font-normal ml-1">{fieldMeta.unit}</span>}
                </div>
                <div className="mt-auto pt-1 pl-1.5">
                    {node.state.timestamp && (
                        <div className="text-[9px] font-medium text-slate-400">
                            Updated {new Date(node.state.timestamp).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>
        );"""

content = content.replace(old_leaf, new_leaf)

# Make root branches compact
old_root = """        if (isRoot) {
            return (
                <div className="space-y-6">
                    {leaves.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {leaves.map(leaf => <LiveMetricTreeRenderer key={leaf.path} node={leaf} name={leaf.name} level={level + 1} dataFields={dataFields} />)}
                        </div>
                    )}"""
                    
new_root = """        if (isRoot) {
            return (
                <div className="space-y-4">
                    {leaves.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {leaves.map(leaf => <LiveMetricTreeRenderer key={leaf.path} node={leaf} name={leaf.name} level={level + 1} dataFields={dataFields} />)}
                        </div>
                    )}"""

content = content.replace(old_root, new_root)

# Make nested groups compact
old_nested = """        return (
            <div className={`border ${level > 1 ? 'border-gray-200 shadow-sm bg-slate-50/50' : 'border-gray-200/60 bg-white'} rounded-xl p-4 sm:p-5 mb-4`}>
                <div className="flex-between align-center mb-4 border-b border-gray-100 pb-2">
                    <h4 className={`font-bold tracking-wide text-main ${level > 1 ? 'text-sm' : 'text-xs text-slate-500'}`}>
                        {groupName}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                        {childCount} field{childCount !== 1 ? 's' : ''}
                    </span>
                </div>
                
                <div className="space-y-4">
                    {leaves.length > 0 && (
                        <div className={`grid gap-4 ${gridClass}`}>
                            {leaves.map(leaf => <LiveMetricTreeRenderer key={leaf.path} node={leaf} name={leaf.name} level={level + 1} dataFields={dataFields} />)}
                        </div>
                    )}
                    {branches.length > 0 && (
                        <div className="space-y-4 mt-4">
                            {branches.map(branch => {
                                const branchName = Object.keys(node.children).find(k => node.children[k] === branch);
                                return <LiveMetricTreeRenderer key={branchName} node={branch} name={branchName} level={level + 1} dataFields={dataFields} />;
                            })}
                        </div>
                    )}
                </div>
            </div>
        );"""

new_nested = """        return (
            <div className={`border ${level > 1 ? 'border-gray-200 shadow-sm bg-slate-50/50' : 'border-gray-200/60 bg-white'} rounded-lg p-3 sm:p-4 mb-3`}>
                <div className="flex-between align-center mb-3 border-b border-gray-100 pb-1.5">
                    <h4 className={`font-bold tracking-wide text-main ${level > 1 ? 'text-xs' : 'text-[11px] text-slate-500'}`}>
                        {groupName}
                    </h4>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                        {childCount} field{childCount !== 1 ? 's' : ''}
                    </span>
                </div>
                
                <div className="space-y-3">
                    {leaves.length > 0 && (
                        <div className={`grid gap-3 ${gridClass}`}>
                            {leaves.map(leaf => <LiveMetricTreeRenderer key={leaf.path} node={leaf} name={leaf.name} level={level + 1} dataFields={dataFields} />)}
                        </div>
                    )}
                    {branches.length > 0 && (
                        <div className="space-y-3 mt-3">
                            {branches.map(branch => {
                                const branchName = Object.keys(node.children).find(k => node.children[k] === branch);
                                return <LiveMetricTreeRenderer key={branchName} node={branch} name={branchName} level={level + 1} dataFields={dataFields} />;
                            })}
                        </div>
                    )}
                </div>
            </div>
        );"""

content = content.replace(old_nested, new_nested)


with open("frontend/src/pages/WorkspaceDataDeviceView.jsx", "w") as f:
    f.write(content)

print("Compacted Live Metrics.")
