const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const Workspace = require('../models/workspace');
const emailService = require('../services/emailService');

const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await User.create(name, email, password_hash, false);
        

        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: { 
                id: newUser.id, 
                name: newUser.name, 
                email: newUser.email,
                is_platform_admin: false 
            }
        });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, is_platform_admin: user.is_platform_admin }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_platform_admin: user.is_platform_admin
            },
            message: 'Login successful'
        });
    } catch (err) {
        next(err);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.json({ success: true, message: 'If that email exists, a password reset link has been sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await User.setResetToken(user.id, token, expiresAt);

        const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
        
        try {
            await emailService.sendPasswordResetEmail(user.email, resetUrl);
        } catch (emailErr) {
            console.error('Failed to send email:', emailErr);
        }

        return res.json({ success: true, message: 'If that email exists, a password reset link has been sent.' });
    } catch (err) {
        next(err);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and new password are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const user = await User.findByResetToken(token);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await User.updatePassword(user.id, password_hash);

        return res.json({ success: true, message: 'Password has been successfully reset. You can now log in.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, forgotPassword, resetPassword };
