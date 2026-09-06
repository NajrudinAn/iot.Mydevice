const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'backend', 'tests', 'portal.test.js');
let content = fs.readFileSync(file, 'utf8');

// For User 2, inject a create workspace before fetching it
const target = "const res = await request(app).get('/api/workspaces').set('Authorization', `Bearer ${token2}`);";
content = content.replace(target, "await request(app).post('/api/workspaces').set('Authorization', `Bearer ${token2}`).send({ name: 'Default Workspace' });\n        " + target);

fs.writeFileSync(file, content, 'utf8');
