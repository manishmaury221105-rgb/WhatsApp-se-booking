"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const whatsappService_js_1 = require("../services/whatsappService.js");
const router = (0, express_1.Router)();
// GET /api/templates
router.get('/', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const templates = database_js_1.db.prepare('SELECT * FROM message_templates WHERE business_id = ? ORDER BY created_at ASC').all(businessId);
    const formatted = templates.map((t) => {
        let vars = [];
        try {
            vars = JSON.parse(t.variables);
        }
        catch (e) { }
        return {
            ...t,
            variables_list: vars
        };
    });
    res.json({ success: true, templates: formatted });
});
// PUT /api/templates/:id
router.put('/:id', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { id } = req.params;
    const { name, content, variables, is_active } = req.body;
    const varsJson = variables ? (typeof variables === 'string' ? variables : JSON.stringify(variables)) : null;
    database_js_1.db.prepare(`
    UPDATE message_templates
    SET name = COALESCE(?, name),
        content = COALESCE(?, content),
        variables = COALESCE(?, variables),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).run(name, content, varsJson, is_active !== undefined ? (is_active ? 1 : 0) : null, id, businessId);
    const updated = database_js_1.db.prepare('SELECT * FROM message_templates WHERE id = ?').get(id);
    res.json({ success: true, template: updated });
});
// POST /api/templates/preview
router.post('/preview', authMiddleware_js_1.authenticateToken, (req, res) => {
    const { content, sample_data = {} } = req.body;
    const defaultSamples = {
        customer_name: 'Rahul Verma',
        service_name: 'Hair Cut & Styling',
        staff_name: 'Rahul Sharma',
        booking_id: 'BK1024',
        date: '2026-09-20',
        time: '4:00 PM',
        price: '₹350',
        business_name: 'Luxe Salon & Spa'
    };
    const merged = { ...defaultSamples, ...sample_data };
    const preview = whatsappService_js_1.WhatsAppService.renderTemplate(content || '', merged);
    res.json({ success: true, preview });
});
exports.default = router;
