const deviceMonitor = require('./services/deviceMonitor');
const commandMonitor = require('./services/commandMonitor');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/users');
const workspaceRoutes = require('./routes/workspaces');
const applicationRoutes = require('./routes/applications');
const externalApiRoutes = require('./routes/externalApi');
const apiV1Routes = require('./routes/apiV1');
const hostedAppRoutes = require('./routes/hostedApp');
const errorHandler = require('./middleware/errorHandler');
const { initMqttClient } = require('./mqtt/client');
const RetentionService = require('./services/retentionService');

const app = express();

app.use(express.json());

// Ensure backend_admin is authorized in mosquitto automatically on startup
try {
    const pwdPath = require('path').join(__dirname, '../../mosquitto/config/mosquitto.passwd');
    const aclPath = require('path').join(__dirname, '../../mosquitto/config/mosquitto.acl');
    const mqttUser = process.env.MQTT_USERNAME || 'backend_admin';
    const mqttPass = process.env.MQTT_PASSWORD || 'super_secret_backend';
    
    const fs = require('fs');
    const { execSync } = require('child_process');
    
    // 1. Force password into mosquitto.passwd
    execSync(`sudo mosquitto_passwd -b ${pwdPath} ${mqttUser} ${mqttPass}`);
    
    // 2. Ensure ACL file has backend_admin at the top
    let aclContent = `user ${mqttUser}\ntopic readwrite #\n\n`;
    try {
        let currentAcl = fs.readFileSync(aclPath, 'utf8');
        if (!currentAcl.includes(`user ${mqttUser}`)) {
            fs.writeFileSync(aclPath, aclContent + currentAcl);
        }
    } catch (e) {
        fs.writeFileSync(aclPath, aclContent);
    }
    
    // 3. Reload Mosquitto to apply both
    execSync(`sudo pkill -HUP mosquitto`);
    console.log(`Successfully verified ${mqttUser} in Mosquitto and reloaded broker!`);
} catch (error) {
    console.log('Skipping auto-mosquitto_passwd:', error.message);
}

// Init MQTT
initMqttClient();

// Init Retention Job (runs every 1 hour)
if (process.env.NODE_ENV !== 'test') {
    RetentionService.start();
}

// Routes
const standardCors = cors();
const dynamicCors = require('./middleware/dynamicCors');

app.use('/api/health', standardCors, healthRoutes);
app.use('/api/auth', standardCors, authRoutes);
app.use('/api/users', standardCors, userRoutes);
app.use('/api/workspaces', standardCors, workspaceRoutes);
app.use('/api/applications', standardCors, applicationRoutes);
app.use('/api/devices', standardCors, deviceRoutes);

const applicationUploadsRoutes = require('./routes/applicationUploads');
app.use('/api/applications', standardCors, applicationUploadsRoutes);

app.use('/api/v1/routes', dynamicCors, apiV1Routes); // Authenticated dynamic APIs
app.use('/api/v1/public', dynamicCors, apiV1Routes); // Public dynamic APIs
app.use('/api/v1', dynamicCors, externalApiRoutes); // Legacy dynamic external APIs

app.use('/hosted', dynamicCors, hostedAppRoutes); // Custom Hosted Frontends

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

if (require.main === module) {
    const port = process.env.PORT || 3000;
    deviceMonitor.start();
    commandMonitor.start();
    const server = app.listen(port, () => {
        console.log(`Backend server running on port ${port}`);
    });

    const shutdown = async () => {
        console.log('Shutting down server gracefully...');
        
        server.close(async () => {
            console.log('HTTP server closed.');
            
            // Stop background workers
            deviceMonitor.stop();
            commandMonitor.stop();
            if (process.env.NODE_ENV !== 'test') {
                RetentionService.stop();
            }
            
            // Close MQTT
            const { closeMqttClient } = require('./mqtt/client');
            closeMqttClient();
            
            // Close Database pool
            const db = require('./config/db');
            if (db.pool) {
                await db.pool.end();
                console.log('Database pool closed.');
            }
            
            process.exit(0);
        });
        
        // Force exit if graceful shutdown fails after 10s
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000).unref();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

module.exports = app; // For testing
