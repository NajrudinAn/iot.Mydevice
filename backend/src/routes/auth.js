const express = require('express');
const { register, login, forgotPassword, resetPassword } = require('../controllers/authController');

const router = express.Router();

const rateLimit = require('express-rate-limit');

const authLimiter = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 login/register requests per windowMs
    message: { success: false, message: 'Too many authentication attempts from this IP, please try again later' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
