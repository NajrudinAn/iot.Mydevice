async function testAPI() {
    try {
        const baseURL = 'http://localhost:3000/api';
        
        console.log('1. Logging in...');
        let res = await fetch(`${baseURL}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'owner@iot.com', password: 'password123' })
        });
        const loginData = await res.json();
        const token = loginData.token;
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        
        console.log('2. Fetching workspaces...');
        res = await fetch(`${baseURL}/workspaces`, { headers });
        const wsData = await res.json();
        
        let workspaceId = null;
        for (const ws of wsData.workspaces) {
            const devRes = await fetch(`${baseURL}/workspaces/${ws.id}/devices`, { headers });
            const devData = await devRes.json();
            if (devData.devices && devData.devices.find(d => d.device_id === 'DEV-007-A5D4')) {
                workspaceId = ws.id;
                break;
            }
        }
        
        if (!workspaceId) throw new Error("Could not find DEV-007-A5D4 in any workspace");
        console.log(`Found Workspace: ${workspaceId}`);
        
        console.log('3. Sending Command to DEV-007-A5D4...');
        res = await fetch(`${baseURL}/workspaces/${workspaceId}/devices/DEV-007-A5D4/commands`, {
            method: 'POST', headers,
            body: JSON.stringify({ type: 'SET_SPEED', payload: { speed: 1200 } })
        });
        const cmdRes = await res.json();
        if (!cmdRes.success) throw new Error(JSON.stringify(cmdRes));
        console.log('Command sent successfully:', cmdRes.command.id);
        const commandId = cmdRes.command.id;
        
        console.log('4. Waiting 2 seconds for ACK...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('5. Fetching Device Commands History...');
        res = await fetch(`${baseURL}/workspaces/${workspaceId}/devices/DEV-007-A5D4/commands`, { headers });
        const cmdHistoryRes = await res.json();
        const sentCmd = cmdHistoryRes.commands.find(c => c.id === commandId);
        console.log(`Command Status: ${sentCmd ? sentCmd.status : 'Not found'}`);
        
        console.log('\n--- ALL TESTS PASSED ---');
    } catch (err) {
        console.error('Test Failed:', err);
    }
}
testAPI();
