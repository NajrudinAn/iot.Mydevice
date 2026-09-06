const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'backend', 'tests');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));

for (const file of files) {
    const filePath = path.join(testDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    let modified = false;

    // We will look for:
    // const wsRes = await request(app).get('/api/workspaces') ...
    // And prepend:
    // await request(app).post('/api/workspaces').set('Authorization', `Bearer ${ownerToken || token || userToken || userAToken || userBToken}`).send({ name: 'Default Workspace' });

    // But each test uses different token variables. Let's just do a blanket find/replace.
    if (content.includes('workspaceId = wsRes.body.workspaces[0].id;') || 
        content.includes('workspaceA_Id = wsA.body.workspaces[0].id;') ||
        content.includes('userADefaultWorkspaceId = res.body.workspaces[0].id;')) {
        
        // This regex matches: const res = await request(app).get('/api/workspaces').set('Authorization', `Bearer ${tokenVar}`);
        const getWsRegex = /const\s+(\w+)\s*=\s*await\s+request\(app\)\.get\(['"`]\/api\/workspaces['"`]\)\.set\(['"`]Authorization['"`],\s*`Bearer\s+\$\{(.*?)\}`\);/g;
        
        content = content.replace(getWsRegex, (match, resVar, tokenVar) => {
            return `await request(app).post('/api/workspaces').set('Authorization', \`Bearer \$\{${tokenVar}\}\`).send({ name: 'Default Workspace' });\n        ${match}`;
        });
        modified = true;
    }
    
    // special cases
    if (file === 'portal.test.js') {
        const regex = /const res = await request\(app\)\.get\('\/api\/workspaces'\)\.set\('Authorization', `Bearer \$\{token\}`\);/;
        if (content.match(regex)) {
            content = content.replace(regex, `await request(app).post('/api/workspaces').set('Authorization', \`Bearer \$\{token\}\`).send({ name: 'Default Workspace' });\n        const res = await request(app).get('/api/workspaces').set('Authorization', \`Bearer \$\{token\}\`);`);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed', file);
    }
}
