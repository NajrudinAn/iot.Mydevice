const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/WorkspaceDevices.jsx', 'utf8');

// Replace Filter Bar
const filterBarStart = content.indexOf('          {/* Filter Bar */}');
const filterBarEnd = content.indexOf('          {/* Data Table */}');

const newFilterBar = `          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex gap-3 items-center">
            <div className="relative flex-1 max-w-[400px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search devices..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-main outline-none focus:border-blue-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <select 
                className="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-bold text-main outline-none focus:border-blue-500 transition-colors"
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <button className="p-2 bg-white border border-gray-200 rounded-lg text-slate-500 hover:bg-gray-50 transition-colors">
              <Filter size={16} strokeWidth={2} />
            </button>
          </div>

`;

content = content.substring(0, filterBarStart) + newFilterBar + content.substring(filterBarEnd);

// Replace Table Row
const trStart = content.indexOf('<tr key={device.id} className="border-b border-gray-50 hover:bg-slate-50 transition-colors bg-white">');
const tbodyEnd = content.indexOf('                  )}', trStart);

const newRow = `<tr key={device.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors bg-white">
                        <td className="px-6 py-4">
                          <div className="flex-align gap-3">
                            <div className="ds-icon-box bg-blue-100 text-blue-600 rounded-lg" style={{ width: '32px', height: '32px' }}>
                              <Server size={16} strokeWidth={2} />
                            </div>
                            <span className="font-bold text-[13px] text-main">{device.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-2 bg-slate-50 border border-gray-100 rounded-lg px-3 py-1.5 w-fit">
                            <span className="font-mono text-[11px] font-bold text-slate-600 tracking-wide">
                              {device.device_id}
                            </span>
                            <button className="text-slate-400 hover:text-main" onClick={() => handleCopy(device.device_id, 'Device ID')}>
                              <Copy size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-bold text-[11px]">
                            {device.device_type || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={\`inline-flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-full text-[11px] font-bold \${device.status === 'online' ? 'bg-green-50 text-green-700' : 'bg-slate-50 border border-gray-100 text-slate-600'}\`}>
                            <span className={\`w-1.5 h-1.5 rounded-full \${device.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}\`}></span>
                            {device.status === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-2 text-slate-500 text-[12px] font-medium">
                            <Calendar size={14} strokeWidth={2} />
                            {formatLastSeen(device.last_seen)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button className="p-1.5 hover:bg-gray-100 rounded-md text-slate-400 transition-colors">
                              <MoreVertical size={16} />
                            </button>
                            <button 
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-main hover:border-gray-300 transition-all shadow-sm"
                              onClick={() => navigate(\`/workspaces/\${workspaceId}/devices/\${device.id}\`)}
                            >
                              View <ArrowRight size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
`;

content = content.substring(0, trStart) + newRow + content.substring(tbodyEnd);

// Add min-h to the tbody to push footer down
content = content.replace('<div className="overflow-x-auto w-full">', '<div className="overflow-x-auto w-full min-h-[400px]">');

fs.writeFileSync('frontend/src/pages/WorkspaceDevices.jsx', content);
console.log('Patched');
