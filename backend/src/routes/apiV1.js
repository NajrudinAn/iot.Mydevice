const express = require('express');
const router = express.Router({ mergeParams: true });
const { apiExecutionAuth } = require('../middleware/apiExecutionAuth');
const apiExecutionController = require('../controllers/apiExecutionController');

// All /api/v1/:workspace_id/* routes go through the exact same middleware and handler
router.all('/*', apiExecutionAuth, apiExecutionController.handleExecution);

module.exports = router;
