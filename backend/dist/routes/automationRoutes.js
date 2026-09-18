"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const automationWorker_js_1 = require("../services/automationWorker.js");
const router = (0, express_1.Router)();
// GET /api/automations
router.get('/', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const rules = database_js_1.db.prepare(`
    SELECT ar.*, mt.name as template_name, mt.content as template_content
    FROM automation_rules ar
    LEFT JOIN message_templates mt ON ar.template_id = mt.id
    WHERE ar.business_id = ?
    ORDER BY ar.created_at ASC
  `).all(businessId);
    res.json({ success: true, automations: rules });
});
// PUT /api/automations/:id
router.put('/:id', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { id } = req.params;
    const { is_enabled, template_id, delay_minutes } = req.body;
    database_js_1.db.prepare(`
    UPDATE automation_rules
    SET is_enabled = COALESCE(?, is_enabled),
        template_id = COALESCE(?, template_id),
        delay_minutes = COALESCE(?, delay_minutes),
        updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).run(is_enabled !== undefined ? (is_enabled ? 1 : 0) : null, template_id, delay_minutes, id, businessId);
    const updated = database_js_1.db.prepare(`
    SELECT ar.*, mt.name as template_name, mt.content as template_content
    FROM automation_rules ar
    LEFT JOIN message_templates mt ON ar.template_id = mt.id
    WHERE ar.id = ?
  `).get(id);
    res.json({ success: true, automation: updated });
});
// POST /api/automations/test-worker
router.post('/test-worker', authMiddleware_js_1.authenticateToken, async (req, res) => {
    const result = await automationWorker_js_1.AutomationWorker.processReminders();
    res.json({ success: true, processed: result });
});
exports.default = router;
