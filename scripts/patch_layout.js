const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/WorkspaceDevices.jsx', 'utf8');

// 1. Fix Filter Bar Layout
const filterBarStart = content.indexOf('          {/* Filter Bar */}');
const filterBarEnd = content.indexOf('          {/* Data Table */}');

const newFilterBar = `          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex gap-4 items-center">
            <div className="relative w-[340px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search devices..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-main outline-none focus:border-blue-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative w-[180px]">
              <select 
                className="appearance-none w-full pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-bold text-main outline-none focus:border-blue-500 transition-colors"
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
            <button className="p-2.5 bg-white border border-gray-200 rounded-lg text-slate-500 hover:bg-gray-50 transition-colors flex-align justify-center" style={{ width: '40px', height: '40px' }}>
              <Filter size={16} strokeWidth={2} />
            </button>
          </div>

`;

content = content.substring(0, filterBarStart) + newFilterBar + content.substring(filterBarEnd);

// 2. Fix Table Wrapper Layout to push footer to bottom
content = content.replace(
  '<div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">',
  '<div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6 flex flex-col justify-between" style={{ minHeight: "500px" }}>'
);
content = content.replace(
  '<div className="overflow-x-auto w-full min-h-[400px]">',
  '<div className="overflow-x-auto w-full flex-1">'
);

fs.writeFileSync('frontend/src/pages/WorkspaceDevices.jsx', content);
console.log('Patched layout');
