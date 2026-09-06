const { getPlatformStats, getPlatformApplications } = require('./src/controllers/platformStatsController');
const db = require('./src/config/db');

async function test() {
    const req = { user: { id: '5395e5b3-241f-4ff6-aecf-b28e671202e2' } };
    const res = {
        json: (data) => console.log("JSON:", JSON.stringify(data).substring(0, 100)),
        status: (code) => { console.log("STATUS:", code); return res; }
    };
    const next = (err) => console.error("NEXT ERR:", err.message, err.stack);
    
    console.log("Testing getPlatformStats...");
    await getPlatformStats(req, res, next);

    console.log("Testing getPlatformApplications...");
    await getPlatformApplications(req, res, next);
    
    db.pool.end();
}
test();
