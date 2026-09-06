const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ success: false, message: 'Invalid token format' });
    }

    try {
        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Security boundary: Application tokens cannot access non-application routes.
        if (decoded.type === 'application') {
            if (!req.originalUrl.startsWith('/api/applications')) {
                return res.status(403).json({ success: false, message: 'Application token cannot be used for platform operations' });
            }
        }
        
        req.user = decoded; // { id, email, type, applicationId, role }
        next();
    } catch (err) {
        console.error("JWT Verify Error:", err);
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;
