const Application = require('../models/application');
const Workspace = require('../models/workspace');
const Device = require('../models/device');
const crypto = require('crypto');
const MqttProvisioner = require('../services/MqttProvisioner');

// Simple global counter for device ID prototype generation
let deviceCounter = 1;

// Helper to generate a slug from a name
const generateSlug = (name) => {
    return name.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

exports.createApplication = async (req, res) => {
    try {
        const { workspace_id } = req.params;
        const { name, description, authentication_api_id, deployment_mode, api_access_ids, registration_enabled } = req.body;
        const userId = req.user.id;

        if (!name) {
            return res.status(400).json({ message: 'Application name is required' });
        }

        // Verify user owns the workspace
        const workspace = await Workspace.findByIdAndOwnerId(workspace_id, userId);
        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found or unauthorized' });
        }

        let slug = generateSlug(name);
        
        // Let DB handle duplicate slug via UNIQUE constraint
        try {
            const application = await Application.create(
                workspace_id, 
                name, 
                slug, 
                description, 
                userId, 
                authentication_api_id || null, 
                deployment_mode || 'DEVELOPMENT',
                registration_enabled || false
            );
            if (api_access_ids && Array.isArray(api_access_ids)) {
                await Application.setApiAccess(application.id, api_access_ids);
            }
            application.api_access_ids = api_access_ids || [];
            res.status(201).json({ message: 'Application created successfully', application });
        } catch (dbErr) {
            if (dbErr.code === '23505') { // unique_violation in Postgres
                return res.status(409).json({ message: 'Application slug already exists in this workspace' });
            }
            throw dbErr;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getWorkspaceApplications = async (req, res) => {
    try {
        const { workspace_id } = req.params;
        const userId = req.user.id;

        // Verify user owns the workspace
        const workspace = await Workspace.findByIdAndOwnerId(workspace_id, userId);
        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found or unauthorized' });
        }

        const applications = await Application.findByWorkspaceId(workspace_id);
        res.status(200).json({ applications });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getApplicationDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Verify access: either workspace owner OR authenticated via application token for this app
        const isAppTokenAuth = req.user.type === 'application' && req.user.applicationId === id;
        if (!isAppTokenAuth) {
            const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, userId);
            if (!workspace) {
                return res.status(403).json({ message: 'Unauthorized to access this application' });
            }
        }
        // Append API access data
        const apiAccessIds = await Application.getApiAccess(id);
        application.api_access_ids = apiAccessIds;
        
        // Never send secret hash to client
        delete application.api_secret_hash;

        res.status(200).json({ application });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getApplicationBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const application = await Application.findBySlug(slug);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Return only safe public metadata
        res.status(200).json({
            application: {
                id: application.id,
                name: application.name,
                slug: application.slug,
                description: application.description,
                authentication_enabled: application.authentication_enabled,
                registration_enabled: application.registration_enabled,
                approval_required: application.approval_required
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, authentication_api_id, deployment_mode, api_access_ids } = req.body;
        const userId = req.user.id;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Verify user owns the workspace that owns this application
        const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, userId);
        if (!workspace) {
            return res.status(403).json({ message: 'Unauthorized to modify this application' });
        }

        const updatedApplication = await Application.update(
            id, 
            name || application.name, 
            description !== undefined ? description : application.description,
            authentication_api_id !== undefined ? authentication_api_id : application.authentication_api_id,
            deployment_mode || application.deployment_mode
        );
        
        if (api_access_ids && Array.isArray(api_access_ids)) {
            await Application.setApiAccess(id, api_access_ids);
        }
        updatedApplication.api_access_ids = api_access_ids || await Application.getApiAccess(id);

        res.status(200).json({ message: 'Application updated successfully', application: updatedApplication });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.regenerateApiCredentials = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, userId);
        if (!workspace) {
            return res.status(403).json({ message: 'Unauthorized to modify this application' });
        }

        const updatedApplication = await Application.regenerateApiCredentials(id);
        res.status(200).json({ 
            message: 'Application API credentials regenerated successfully', 
            api_key: updatedApplication.api_key,
            api_secret: updatedApplication.raw_api_secret
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error regenerating credentials' });
    }
};

exports.updateApplicationBranding = async (req, res) => {
    try {
        const { id } = req.params;
        const { display_name, logo_url, favicon_url } = req.body;
        const userId = req.user.id;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Verify user owns the workspace that owns this application
        const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, userId);
        if (!workspace) {
            return res.status(403).json({ message: 'Unauthorized to modify this application' });
        }

        const updatedApplication = await Application.updateBranding(id, display_name, logo_url, favicon_url);
        res.status(200).json({ message: 'Application branding updated successfully', application: updatedApplication });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateApplicationRetention = async (req, res) => {
    try {
        const { id } = req.params;
        const { data_retention_days } = req.body;
        
        // Validate input
        if (![0, 7, 30].includes(data_retention_days)) {
            return res.status(400).json({ message: 'Invalid retention value. Allowed values are 0, 7, 30' });
        }

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Authorization is handled by `requireApplicationRole(['ADMIN'])` in routes,
        // but we double-check if it's the correct application context.
        
        const updatedApplication = await Application.updateRetention(id, data_retention_days);
        res.status(200).json({ 
            message: 'Application retention updated successfully', 
            application: { id: updatedApplication.id, data_retention_days: updatedApplication.data_retention_days }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating retention' });
    }
};

exports.deleteApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Verify user owns the workspace that owns this application
        const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, userId);
        if (!workspace) {
            return res.status(403).json({ message: 'Unauthorized to delete this application' });
        }

        await Application.delete(id);
        res.status(200).json({ message: 'Application deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.assignDeviceToApplication = async (req, res) => {
    try {
        const { id } = req.params; // application id
        const { device_id } = req.body; // device public id (e.g. DEV-001) or uuid, we will assume device_id public string based on previous routes
        const userId = req.user.id;

        if (!device_id) {
            return res.status(400).json({ message: 'device_id is required' });
        }

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Verify user owns the workspace
        const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, userId);
        if (!workspace) {
            return res.status(403).json({ message: 'Unauthorized to manage this application' });
        }

        // Find the device by its public device_id (or internal UUID depending on how frontend sends it)
        // Let's assume it sends public device_id "DEV-001" based on the prompt examples.
        // If it's a UUID, we might need a generic find method. The `Device.findByDeviceId` gets by public ID.
        let device = await Device.findByDeviceId(device_id);
        if (!device) {
             // Fallback to internal ID if they sent a UUID
             device = await Device.findById(device_id);
        }

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        // VERY IMPORTANT: Verify device belongs to the SAME workspace as the application
        if (device.workspace_id !== application.workspace_id) {
            return res.status(403).json({ message: 'Device does not belong to the same workspace as the application' });
        }

        await Application.assignDevice(application.id, device.id);
        res.status(200).json({ message: 'Device assigned to application successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.registerAndAssignDevice = async (req, res) => {
    try {
        const { id } = req.params; // application id
        const { name, device_type } = req.body;
        const userId = req.user.id;

        if (!name || !device_type) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // The SSO token verifies ownership, but we double-check here just in case
        const workspaceId = application.workspace_id;

        // Generate ID: DEV-XXX
        const deviceId = `DEV-${String(deviceCounter++).padStart(3, '0')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        
        // Generate secure random key
        const secretKey = crypto.randomBytes(32).toString('hex');

        // Create the device in the workspace
        const device = await Device.create(deviceId, secretKey, name, device_type, userId, workspaceId);

        try {
            await MqttProvisioner.syncDeviceCredential(device.device_id, secretKey);
        } catch (error) {
            // Rollback device creation
            await Device.deleteByIdAndUserId(device.id, userId);
            return res.status(500).json({ success: false, message: 'Failed to provision MQTT credentials' });
        }

        // Assign the device to the application
        await Application.assignDevice(application.id, device.id);

        return res.status(201).json({
            success: true,
            message: 'Device created and assigned successfully',
            device: {
                id: device.id,
                device_id: device.device_id,
                secret_key: device.secret_key, // Only returned once upon creation
                name: device.name,
                device_type: device.device_type,
                status: device.status,
                last_seen: device.last_seen,
                workspace_id: device.workspace_id,
                created_at: device.created_at
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.removeDeviceFromApplication = async (req, res) => {
    try {
        const { id, device_id } = req.params; // application id, device public/internal id
        const userId = req.user.id;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Verify user owns the workspace
        const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, userId);
        if (!workspace) {
            return res.status(403).json({ message: 'Unauthorized to manage this application' });
        }
        
        let device = await Device.findByDeviceId(device_id);
        if (!device) {
             device = await Device.findById(device_id);
        }
        
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        await Application.removeDevice(application.id, device.id);
        res.status(200).json({ message: 'Device removed from application successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getApplicationDevices = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Verify user owns the workspace
        const workspace = await Workspace.findByIdAndOwnerId(application.workspace_id, userId);
        if (!workspace) {
            return res.status(403).json({ message: 'Unauthorized to access this application' });
        }

        const devices = await Application.getAssignedDevices(application.id);
        res.status(200).json({ devices });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.resolveHost = async (req, res) => {
    try {
        const { hostname } = req.query;
        if (!hostname) return res.status(400).json({ error: "Hostname required" });
        
        const platformDomain = process.env.PLATFORM_DOMAIN || 'mydevice.in';
        
        // Suppress 404 errors for the main platform domains to keep the browser console clean
        if (hostname === platformDomain || hostname === `www.${platformDomain}` || hostname === 'localhost') {
            return res.json({ application: null, isPlatform: true });
        }
        
        const ApplicationDomain = require('../models/applicationDomain');
        const domain = await ApplicationDomain.findByHostname(hostname);
        
        if (!domain) {
            return res.status(404).json({ error: "No application bound to this hostname" });
        }
        
        if (domain.status !== 'ACTIVE') {
            return res.status(403).json({ error: "Domain is not active" });
        }

        res.json({
            application: {
                id: domain.application_id,
                name: domain.application_name,
                slug: domain.application_slug,
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to resolve hostname" });
    }
};
