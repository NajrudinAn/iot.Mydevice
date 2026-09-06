const { Client } = require('pg');

async function testJsonb() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/iot_platform' });
    await client.connect();
    try {
        const path = ['sensor1', 'temperature'];
        const res = await client.query(`
            SELECT jsonb_extract_path('{"sensor1": {"temperature": 25.4}}'::jsonb, VARIADIC $1::text[]) as val
        `, [path]);
        console.log("Result:", res.rows[0].val);
    } finally {
        await client.end();
    }
}
testJsonb();
