const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/WorkspaceDevices.jsx', 'utf8');

// 1. Fix Filter Bar robust flex layout
const filterBarStart = content.indexOf('          {/* Filter Bar */}');
const filterBarEnd = content.indexOf('          {/* Data Table */}');

const newFilterBar = `          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex gap-4 items-center">
            <div className="flex items-center w-[340px] pl-3 pr-2 py-2 bg-white border border-gray-200 rounded-lg focus-within:border-blue-500 transition-colors">
              <Search size={16} className="text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search devices..."
                className="w-full bg-transparent border-none outline-none text-sm text-main"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative flex items-center w-[180px] bg-white border border-gray-200 rounded-lg focus-within:border-blue-500 transition-colors">
              <select 
                className="appearance-none w-full pl-4 pr-10 py-2 bg-transparent text-[13px] font-bold text-main outline-none"
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
              <div className="absolute right-3 pointer-events-none flex items-center justify-center h-full text-slate-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <button className="p-2.5 bg-white border border-gray-200 rounded-lg text-slate-500 hover:bg-gray-50 transition-colors flex items-center justify-center" style={{ width: '40px', height: '40px' }}>
              <Filter size={16} strokeWidth={2} />
            </button>
          </div>

`;

content = content.substring(0, filterBarStart) + newFilterBar + content.substring(filterBarEnd);

// 2. Fix View Button rounding
content = content.replace(
  'rounded-lg text-[12px] font-bold text-main hover:border-gray-300',
  'rounded-full text-[12px] font-bold text-main hover:border-gray-300'
);

fs.writeFileSync('frontend/src/pages/WorkspaceDevices.jsx', content);
console.log('Final patch applied');
