const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const testDir = path.join(__dirname, 'backend', 'tests');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));

for (const file of files) {
    const filePath = path.join(testDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace auto-created assertions
    content = content.replace(/expect\(res\.body\.workspaces\.length\)\.toBe\(1\);/g, 'expect(res.body.workspaces.length).toBe(1);'); // we will do manual for workspace.test.js
    
    // For every place that does a login/register in beforeAll or beforeEach, we should just inject a POST to create a workspace
    // Let's just use regex to inject Workspace creation where needed.
    
    fs.writeFileSync(filePath, content, 'utf8');
}
