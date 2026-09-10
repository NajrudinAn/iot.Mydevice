const express = require('express');
const { registerDevice, getDevices, getDeviceDetails, updateDevice, deleteDevice } = require('../controllers/deviceController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.post('/', registerDevice);
router.get('/', getDevices);
router.get('/:id', getDeviceDetails);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);

module.exports = router;
