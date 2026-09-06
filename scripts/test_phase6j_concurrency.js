const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000/api';

async function main() {
    console.log("Starting Concurrency Tests for Domains");

    // 1. Create Admin and Workspace
    const r1 = await axios.post(`${BASE_URL}/auth/register`, {
        name: `Admin Concur ${Date.now()}`,
        email: `admin_${Date.now()}@test.com`,
        password: 'password123'
    });
    const token = r1.data.token;

    const r2 = await axios.post(`${BASE_URL}/workspaces`, { name: 'WS Concur' }, { headers: { Authorization: `Bearer ${token}` } });
    const wsId = r2.data.workspace.id;

    // 2. Create Application A and Application B
    const r3 = await axios.post(`${BASE_URL}/workspaces/${wsId}/applications`, { name: 'App A', slug: `appa-${Date.now()}` }, { headers: { Authorization: `Bearer ${token}` } });
    const appA = r3.data.application;

    const r4 = await axios.post(`${BASE_URL}/workspaces/${wsId}/applications`, { name: 'App B', slug: `appb-${Date.now()}` }, { headers: { Authorization: `Bearer ${token}` } });
    const appB = r4.data.application;

    // 3. Request Access Tokens
    const rA = await axios.post(`${BASE_URL}/applications/${appA.id}/auth/request-access`, {}, { headers: { Authorization: `Bearer ${token}` } });
    const tokenA = rA.data.token;

    const rB = await axios.post(`${BASE_URL}/applications/${appB.id}/auth/request-access`, {}, { headers: { Authorization: `Bearer ${token}` } });
    const tokenB = rB.data.token;

    const testHostname = `race-${Date.now()}.com`;

    console.log(`[ ] Race creating domain ${testHostname} on two apps simultaneously...`);

    const p1 = axios.post(`${BASE_URL}/applications/${appA.id}/domains`, { hostname: testHostname, type: 'CUSTOM_DOMAIN' }, { headers: { Authorization: `Bearer ${tokenA}` } });
    const p2 = axios.post(`${BASE_URL}/applications/${appB.id}/domains`, { hostname: testHostname, type: 'CUSTOM_DOMAIN' }, { headers: { Authorization: `Bearer ${tokenB}` } });

    let successCount = 0;
    let failCount = 0;

    const results = await Promise.allSettled([p1, p2]);
    results.forEach(res => {
        if (res.status === 'fulfilled') successCount++;
        else failCount++;
    });

    console.log(`[+] Successes: ${successCount}, Failures: ${failCount}`);
    if (successCount !== 1 || failCount !== 1) {
        console.error("[!] Concurrency test failed. One and only one should succeed.");
        process.exit(1);
    }
    
    console.log("[+] Concurrency test passed.");
}

main().catch(console.error);
