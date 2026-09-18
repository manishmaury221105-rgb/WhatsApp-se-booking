"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const geminiAiAgent_js_1 = require("../services/geminiAiAgent.js");
const router = (0, express_1.Router)();
// GET /api/ai/config
router.get('/config', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const config = database_js_1.db.prepare('SELECT * FROM ai_agent_configs WHERE business_id = ?').get(businessId);
    if (!config) {
        res.status(404).json({ success: false, error: 'AI config not found' });
        return;
    }
    let faqs = [];
    try {
        faqs = JSON.parse(config.faqs_json);
    }
    catch (e) { }
    res.json({
        success: true,
        config: {
            ...config,
            faqs
        }
    });
});
// PUT /api/ai/config
router.put('/config', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { persona_name, language, tone, faqs, cancellation_policy, reschedule_policy, custom_instructions } = req.body;
    const faqsJson = faqs ? (typeof faqs === 'string' ? faqs : JSON.stringify(faqs)) : null;
    database_js_1.db.prepare(`
    UPDATE ai_agent_configs
    SET persona_name = COALESCE(?, persona_name),
        language = COALESCE(?, language),
        tone = COALESCE(?, tone),
        faqs_json = COALESCE(?, faqs_json),
        cancellation_policy = COALESCE(?, cancellation_policy),
        reschedule_policy = COALESCE(?, reschedule_policy),
        custom_instructions = COALESCE(?, custom_instructions),
        updated_at = datetime('now')
    WHERE business_id = ?
  `).run(persona_name, language, tone, faqsJson, cancellation_policy, reschedule_policy, custom_instructions, businessId);
    const updated = database_js_1.db.prepare('SELECT * FROM ai_agent_configs WHERE business_id = ?').get(businessId);
    let parsedFaqs = [];
    try {
        parsedFaqs = JSON.parse(updated.faqs_json);
    }
    catch (e) { }
    res.json({
        success: true,
        config: {
            ...updated,
            faqs: parsedFaqs
        }
    });
});
// POST /api/ai/chat-simulate (Interactive live AI booking test simulator)
router.post('/chat-simulate', authMiddleware_js_1.authenticateToken, async (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { message, customer_phone = '+919999900000', customer_name = 'Test User' } = req.body;
    if (!message) {
        res.status(400).json({ success: false, error: 'Message is required' });
        return;
    }
    try {
        const result = await geminiAiAgent_js_1.GeminiAiAgent.processMessage({
            business_id: businessId,
            customer_phone,
            customer_name,
            user_message: message
        });
        res.json({
            success: true,
            reply: result.reply,
            appointment: result.appointment || null,
            function_called: result.function_called || null
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/ai/chat-simulate/reset
router.post('/chat-simulate/reset', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { customer_phone = '+919999900000' } = req.body;
    database_js_1.db.prepare('DELETE FROM ai_conversations WHERE business_id = ? AND phone = ?').run(businessId, customer_phone);
    res.json({ success: true, message: 'Simulation session reset successfully.' });
});
exports.default = router;
