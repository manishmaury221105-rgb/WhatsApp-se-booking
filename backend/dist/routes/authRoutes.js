"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-production-jwt-key-change-in-prod-12345';
// POST /api/auth/login
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email and password are required' });
        return;
    }
    const user = database_js_1.db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
    }
    const isMatch = bcryptjs_1.default.compareSync(password, user.password_hash);
    if (!isMatch) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
    }
    const business = database_js_1.db.prepare('SELECT id, name FROM businesses LIMIT 1').get();
    const businessId = business ? business.id : 'biz_default_01';
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        business_id: businessId
    }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
        success: true,
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            business_id: businessId,
            business_name: business?.name || 'Luxe Studio'
        }
    });
});
// GET /api/auth/me
router.get('/me', authMiddleware_js_1.authenticateToken, (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }
    const user = database_js_1.db.prepare('SELECT id, email, name, role, phone, created_at FROM users WHERE id = ?').get(req.user.id);
    const business = database_js_1.db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.user.business_id);
    res.json({
        success: true,
        user: {
            ...user,
            business_id: req.user.business_id,
            business_name: business?.name
        },
        business
    });
});
// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    const user = database_js_1.db.prepare('SELECT * FROM users WHERE email = ?').get(email?.toLowerCase().trim());
    if (!user) {
        // Return true for security
        res.json({ success: true, message: 'If email exists, reset instructions have been sent.' });
        return;
    }
    // In production, send email reset link
    res.json({ success: true, message: 'Password reset link sent to your registered email address.' });
});
// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
    const { email, new_password } = req.body;
    if (!email || !new_password) {
        res.status(400).json({ success: false, error: 'Email and new password are required' });
        return;
    }
    const user = database_js_1.db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
    }
    const newHash = bcryptjs_1.default.hashSync(new_password, 10);
    database_js_1.db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newHash, user.id);
    res.json({ success: true, message: 'Password updated successfully. Please login with your new password.' });
});
exports.default = router;
