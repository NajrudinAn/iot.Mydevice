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

const MqttProvisioner = require('./services/MqttProvisioner');

// Ensure backend_admin is authorized in mosquitto automatically on startup
MqttProvisioner.ensureBackendAccess().then(() => {
    // Init MQTT after securing access
    initMqttClient();
}).catch(err => {
    console.error("Failed to provision MQTT access on startup", err);
    initMqttClient(); // try anyway
});

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
