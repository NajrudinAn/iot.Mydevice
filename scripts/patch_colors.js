const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/ApplicationsList.jsx', 'utf8');

// Inside Quick Actions ONLY
const quickActionsStart = content.indexOf('Quick Actions</h2>');
const quickActionsEnd = content.indexOf('Applications in this Workspace</h2>');

let before = content.substring(0, quickActionsStart);
let quickActions = content.substring(quickActionsStart, quickActionsEnd);
let after = content.substring(quickActionsEnd);

// Replace bg-*-50 with bg-*-100
quickActions = quickActions.replace(/bg-blue-50/g, 'bg-blue-100');
quickActions = quickActions.replace(/bg-purple-50/g, 'bg-purple-100');
quickActions = quickActions.replace(/bg-orange-50/g, 'bg-orange-100');
quickActions = quickActions.replace(/bg-green-50/g, 'bg-green-100');

// Replace text-* with text-*-500 for the icons
quickActions = quickActions.replace(/text-blue /g, 'text-blue-500 ');
quickActions = quickActions.replace(/text-purple /g, 'text-purple-500 ');
quickActions = quickActions.replace(/text-orange /g, 'text-orange-500 ');
quickActions = quickActions.replace(/text-green /g, 'text-green-500 ');

fs.writeFileSync('frontend/src/pages/ApplicationsList.jsx', before + quickActions + after);
console.log('Patched colors');
