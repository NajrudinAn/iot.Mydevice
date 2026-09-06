const ApiKey = require('../models/apiKey');
const ApiDefinition = require('../models/apiDefinition');

const requireExternalApiAuth = async (req, res, next) => {
    try {
        const { slug, application_id } = req.params;

        // 1. Resolve API Definition
        const apiDef = await ApiDefinition.findBySlugAndApplication(slug, application_id);
        if (!apiDef) {
            return res.status(404).json({ message: 'API endpoint not found' });
        }

        if (!apiDef.enabled) {
            return res.status(403).json({ message: 'This API is currently disabled' });
        }

        req.apiDefinition = apiDef;
        req.applicationId = application_id;

        // 2. Check Authentication Policy
        if (!apiDef.authentication_required) {
            // Public API - bypass key check
            return next();
        }

        // 3. API Key Verification
        const rawKey = req.header('X-API-Key');
        if (!rawKey) {
            return res.status(401).json({ message: 'Missing X-API-Key header' });
        }

        const keyRecord = await ApiKey.verify(rawKey);
        if (!keyRecord) {
            return res.status(401).json({ message: 'Invalid, revoked, or expired API Key' });
        }

        // 4. Scope Verification
        if (keyRecord.api_definition_id !== apiDef.id) {
            // Very critical: key is valid but belongs to a different API
            return res.status(403).json({ message: 'API Key is not authorized for this specific endpoint' });
        }

        // 5. Update last used
        await ApiKey.updateLastUsed(keyRecord.id);

        req.apiKey = keyRecord;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during external API authentication' });
    }
};

module.exports = { requireExternalApiAuth };
