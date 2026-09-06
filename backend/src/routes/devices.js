const express = require('express');
const { registerDevice, getDevices, getDeviceDetails, deleteDevice } = require('../controllers/deviceController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', registerDevice);
router.get('/', getDevices);
router.get('/:id', getDeviceDetails);
router.delete('/:id', deleteDevice);

module.exports = router;
