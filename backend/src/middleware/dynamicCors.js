const cors = require('cors');
const { pool } = require('../config/db');

const dynamicCorsOptions = {
    origin: async function (origin, callback) {
        // 1. If no Origin is provided (e.g. cURL, Postman, server-to-server), allow it.
        // CORS is purely for browser-origin protection.
        if (!origin) {
            return callback(null, true);
        }

        try {
            const url = new URL(origin);
            const hostname = url.hostname;

            // 2. Allow local development origins globally for ease of dev
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return callback(null, true);
            }

            // 3. Check if Origin matches a VERIFIED custom domain in application_domains
            const customRes = await pool.query('SELECT id FROM application_domains WHERE hostname = $1 AND status = $2', [hostname, 'VERIFIED']);
            if (customRes.rows.length > 0) {
                return callback(null, true);
            }

            // 4. Check if Origin matches a Default MyDevice Application Subdomain
            // Assuming the hostname format is `[slug].MyDevice.in` or `[slug].yourdomain.com`
            // We'll extract the first part (the slug) and check if an Application exists with that slug.
            const slug = hostname.split('.')[0];
            const appRes = await pool.query('SELECT id FROM applications WHERE slug = $1', [slug]);
            if (appRes.rows.length > 0) {
                return callback(null, true);
            }

            // 5. If origin doesn't match any allowed application context, reject it.
            // We don't throw an Error because that causes Express to return a 500.
            // We pass false to cors so it omits the Access-Control-Allow-Origin header,
            // naturally causing the browser to block the response.
            return callback(null, false);
            
        } catch (error) {
            console.error('CORS Origin validation error:', error);
            // Fail closed on error
            return callback(null, false);
        }
    },
    // We need to support credentials for application sessions (JWT cookies if applicable)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-API-Secret']
};

const dynamicCors = cors(dynamicCorsOptions);

module.exports = dynamicCors;
