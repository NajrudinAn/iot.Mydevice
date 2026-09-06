const axios = require('axios');

async function testSSO() {
  try {
    // 1. Log in as Demo App Owner
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@app.local',
      password: 'admin123'
    });
    const platformToken = loginRes.data.token;
    console.log('Platform login successful, is_platform_admin:', loginRes.data.user.is_platform_admin);

    // 2. Fetch workspaces
    const wsRes = await axios.get('http://localhost:3000/api/workspaces', {
      headers: { Authorization: `Bearer ${platformToken}` }
    });
    const workspaceId = wsRes.data.workspaces[0].id;
    console.log('Fetched workspace:', workspaceId);

    // 3. Fetch applications
    const appsRes = await axios.get(`http://localhost:3000/api/workspaces/${workspaceId}/applications`, {
      headers: { Authorization: `Bearer ${platformToken}` }
    });
    const appId = appsRes.data.applications[0].id;
    console.log('Fetched application:', appId);

    // 4. Test SSO
    const ssoRes = await axios.post(`http://localhost:3000/api/applications/${appId}/auth/sso`, {}, {
      headers: { Authorization: `Bearer ${platformToken}` }
    });
    console.log('SSO successful! App Token received:', ssoRes.data.token ? 'YES' : 'NO');
    
    // 5. Test Unauthorized App (Fake ID)
    try {
        const fakeAppId = '00000000-0000-0000-0000-000000000000';
        await axios.post(`http://localhost:3000/api/applications/${fakeAppId}/auth/sso`, {}, {
          headers: { Authorization: `Bearer ${platformToken}` }
        });
        console.log('SSO failed: Unauthorized app gave 200 OK (BAD)');
    } catch(err) {
        console.log('Unauthorized app access rejected with:', err.response.status, '(GOOD)');
    }

  } catch (err) {
    console.error('Test failed:', err.response ? err.response.data : err.message);
  }
}
testSSO();
