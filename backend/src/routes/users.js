const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/me/shared-applications', userController.getSharedApplications);
router.put('/me/password', userController.changePassword);

module.exports = router;
