const express = require('express');
const router = express.Router();
const externalApiController = require('../controllers/externalApiController');
const { requireExternalApiAuth } = require('../middleware/externalApiAuth');

// The public dynamic endpoint path
router.get('/applications/:application_id/public-api/:slug', requireExternalApiAuth, externalApiController.getTelemetryData);

module.exports = router;
