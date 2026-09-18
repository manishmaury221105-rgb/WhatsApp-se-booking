"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
// GET /api/business/profile
router.get('/profile', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const business = database_js_1.db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    if (!business) {
        res.status(404).json({ success: false, error: 'Business profile not found' });
        return;
    }
    res.json({ success: true, business });
});
// PUT /api/business/profile
router.put('/profile', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { name, logo_url, phone, whatsapp_number, email, address, timezone, currency, description } = req.body;
    database_js_1.db.prepare(`
    UPDATE businesses
    SET name = COALESCE(?, name),
        logo_url = COALESCE(?, logo_url),
        phone = COALESCE(?, phone),
        whatsapp_number = COALESCE(?, whatsapp_number),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        timezone = COALESCE(?, timezone),
        currency = COALESCE(?, currency),
        description = COALESCE(?, description),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(name, logo_url, phone, whatsapp_number, email, address, timezone, currency, description, businessId);
    const updated = database_js_1.db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    res.json({ success: true, business: updated });
});
exports.default = router;
