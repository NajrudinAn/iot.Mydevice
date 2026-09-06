const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/ApplicationsList.jsx', 'utf8');

// Replace the shadow-sm and hover border colors from the quick action buttons
// Current: className="flex-align gap-4 text-left p-4 bg-white border border-gray-100 rounded-xl cursor-pointer shadow-sm hover:border-blue-400 hover:shadow-md transition-all group"
// Target: className="flex-align gap-4 text-left p-4 bg-white border border-gray-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-all group"

content = content.replace(/className="flex-align gap-4 text-left p-4 bg-white border border-gray-100 rounded-xl cursor-pointer shadow-sm hover:border-[a-z]+-400 hover:shadow-md transition-all group"/g, 
  'className="flex-align gap-4 text-left p-4 bg-white border border-gray-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-all group"');

// Fix icon background colors. Instead of group-hover:bg-blue-500 group-hover:text-white, just use the soft backgrounds and let the icon be colored.
content = content.replace(/group-hover:bg-[a-z]+-500 group-hover:text-white transition-colors/g, '');

fs.writeFileSync('frontend/src/pages/ApplicationsList.jsx', content);
console.log('Patched');
