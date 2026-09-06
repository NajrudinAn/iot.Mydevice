const db = require('./backend/src/config/db');

async function test() {
    try {
        console.log("Testing getPlatformStats query...");
        await db.pool.query('SELECT COUNT(*) FROM workspaces WHERE owner_id = $1', ['5395e5b3-241f-4ff6-aecf-b28e671202e2']);
        
        console.log("Testing getPlatformApplications query...");
        await db.pool.query(`
                SELECT 
                    a.id, 
                    a.workspace_id,
                    a.name, 
                    a.slug,
                    a.created_at,
                    w.name as workspace_name,
                    (SELECT COUNT(*) FROM application_devices ad WHERE ad.application_id = a.id) as device_count,
                    (SELECT COUNT(*) FROM application_users au WHERE au.application_id = a.id) as user_count,
                    (SELECT COUNT(*) FROM dashboard_pages dp JOIN dashboards d ON dp.dashboard_id = d.id WHERE d.application_id = a.id) as dashboard_count,
                    (SELECT COUNT(*) FROM api_definitions api WHERE api.application_id = a.id) as api_count
                FROM applications a
                JOIN workspaces w ON a.workspace_id = w.id
                WHERE w.owner_id = $1
                ORDER BY a.created_at DESC
            `, ['5395e5b3-241f-4ff6-aecf-b28e671202e2']);
            
        console.log("All passed");
    } catch (e) {
        console.error("ERROR: ", e.message);
    } finally {
        db.pool.end();
    }
}
test();
