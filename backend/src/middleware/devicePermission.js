const Application = require('../models/application');
const Device = require('../models/device');
const ApplicationUserDevicePermission = require('../models/applicationUserDevicePermission');

const requireDevicePermission = (requiredAction) => {
    return async (req, res, next) => {
        try {
            // These are set by requireApplicationRole
            const { role, status } = req.applicationMembership;
            const applicationId = req.application.id;
            const userId = req.user.id; // Either platform JWT or App JWT, both have user.id
            const { device_id } = req.params; // Using external device_id string

            if (status !== 'ACTIVE') {
                return res.status(403).json({ message: 'Unauthorized: Membership is disabled' });
            }

            // 1. Verify device exists
            let device = await Device.findByDeviceId(device_id);
            if (!device) {
                device = await Device.findById(device_id); // Support internal UUID if needed
            }

            if (!device) {
                return res.status(404).json({ message: 'Device not found' });
            }

            // 2. Verify device is assigned to application
            const isAssigned = await Application.checkDeviceAssigned(applicationId, device.id);
            if (!isAssigned) {
                return res.status(403).json({ message: 'Device is not assigned to this application' });
            }

            // Bind the internal device to the request for subsequent handlers
            req.device = device;

            // 3. Admin always has full access
            if (role === 'ADMIN') {
                return next();
            }

            // 4. Determine Maximum Role Permissions
            let roleCanView = false;
            let roleCanReadData = false;
            let roleCanCommand = false;

            if (role === 'OPERATOR') {
                roleCanView = true;
                roleCanReadData = true;
                roleCanCommand = true;
            } else if (role === 'VIEWER') {
                roleCanView = true;
                roleCanReadData = true;
                roleCanCommand = false;
            }

            // 5. Fetch device-specific permission overrides for this user
            const devicePerms = await ApplicationUserDevicePermission.getPermissions(applicationId, userId, device.id);

            // Safe defaults if no record exists
            let userCanView = true;
            let userCanReadData = true;
            let userCanCommand = true;

            if (devicePerms) {
                userCanView = devicePerms.can_view;
                userCanReadData = devicePerms.can_read_data;
                userCanCommand = devicePerms.can_command;
            }

            // 6. Intersection: Effective = Role Max ∩ Device Perm
            const effectiveCanView = roleCanView && userCanView;
            const effectiveCanReadData = roleCanReadData && userCanReadData;
            const effectiveCanCommand = roleCanCommand && userCanCommand;

            // 7. Validate Requested Action
            if (requiredAction === 'VIEW_DEVICE' && !effectiveCanView) {
                return res.status(403).json({ message: 'Unauthorized: You do not have permission to view this device' });
            }
            if (requiredAction === 'READ_DATA' && !effectiveCanReadData) {
                return res.status(403).json({ message: 'Unauthorized: You do not have permission to read data from this device' });
            }
            if (requiredAction === 'EXECUTE_COMMAND' && !effectiveCanCommand) {
                return res.status(403).json({ message: 'Unauthorized: You do not have permission to execute commands on this device' });
            }

            next();
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error during device authorization' });
        }
    };
};

module.exports = { requireDevicePermission };
