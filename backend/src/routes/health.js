const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        await db.query('SELECT 1'); // verify db connection
        res.json({
            success: true,
            status: 'ok'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Database connection failed'
        });
    }
});

module.exports = router;
