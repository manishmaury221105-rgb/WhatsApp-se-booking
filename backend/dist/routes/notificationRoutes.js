"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
// GET /api/notifications
router.get('/', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const notifications = database_js_1.db.prepare(`
    SELECT * FROM notifications
    WHERE business_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(businessId);
    const unreadCountRow = database_js_1.db.prepare('SELECT COUNT(*) as count FROM notifications WHERE business_id = ? AND is_read = 0').get(businessId);
    res.json({
        success: true,
        unread_count: unreadCountRow?.count || 0,
        notifications
    });
});
// POST /api/notifications/:id/read
router.post('/:id/read', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { id } = req.params;
    database_js_1.db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND business_id = ?').run(id, businessId);
    res.json({ success: true, message: 'Notification marked as read' });
});
// POST /api/notifications/read-all
router.post('/read-all', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    database_js_1.db.prepare('UPDATE notifications SET is_read = 1 WHERE business_id = ?').run(businessId);
    res.json({ success: true, message: 'All notifications marked as read' });
});
exports.default = router;
