"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const whatsappService_js_1 = require("../services/whatsappService.js");
const router = (0, express_1.Router)();
// GET /api/whatsapp/webhook (Meta Webhook Verification)
router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const config = database_js_1.db.prepare('SELECT webhook_verify_token FROM whatsapp_configs LIMIT 1').get();
    const expectedToken = config?.webhook_verify_token || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'whatsapp_booking_webhook_verify_token_2026';
    if (mode === 'subscribe' && token === expectedToken) {
        console.log('WhatsApp Webhook verified successfully!');
        res.status(200).send(challenge);
    }
    else {
        res.status(403).json({ error: 'Verification token mismatch' });
    }
});
// POST /api/whatsapp/webhook (Meta Inbound Messages & Status Updates)
router.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        const business = database_js_1.db.prepare('SELECT id FROM businesses LIMIT 1').get();
        const businessId = business ? business.id : 'biz_default_01';
        if (body.object === 'whatsapp_business_account' || body.entry) {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    const value = change.value;
                    // 1. Inbound Messages
                    if (value?.messages && value.messages[0]) {
                        const msg = value.messages[0];
                        const fromPhone = msg.from;
                        const senderName = value?.contacts?.[0]?.profile?.name || 'Customer';
                        const messageText = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title || '';
                        if (messageText) {
                            await whatsappService_js_1.WhatsAppService.handleInboundMessage({
                                business_id: businessId,
                                fromPhone,
                                messageText,
                                senderName,
                                waMessageId: msg.id
                            });
                        }
                    }
                    // 2. Delivery / Read Receipts
                    if (value?.statuses && value.statuses[0]) {
                        const statusObj = value.statuses[0];
                        const waMsgId = statusObj.id;
                        const newStatus = statusObj.status?.toUpperCase(); // SENT, DELIVERED, READ, FAILED
                        if (['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(newStatus)) {
                            database_js_1.db.prepare(`
                UPDATE whatsapp_messages
                SET status = ?
                WHERE wa_message_id = ?
              `).run(newStatus, waMsgId);
                        }
                    }
                }
            }
        }
        res.status(200).json({ status: 'ok' });
    }
    catch (err) {
        console.error('Error handling WhatsApp webhook:', err.message);
        res.status(200).json({ status: 'error_logged' });
    }
});
// GET /api/whatsapp/config
router.get('/config', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const config = database_js_1.db.prepare('SELECT * FROM whatsapp_configs WHERE business_id = ?').get(businessId);
    if (!config) {
        res.status(404).json({ success: false, error: 'Config not found' });
        return;
    }
    // Mask sensitive token for security
    const maskedToken = config.access_token && config.access_token.length > 8
        ? `${config.access_token.substring(0, 4)}...${config.access_token.substring(config.access_token.length - 4)}`
        : 'Not configured';
    res.json({
        success: true,
        config: {
            ...config,
            access_token_masked: maskedToken
        }
    });
});
// PUT /api/whatsapp/config
router.put('/config', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { phone_number_id, business_account_id, access_token, webhook_verify_token, is_connected } = req.body;
    database_js_1.db.prepare(`
    UPDATE whatsapp_configs
    SET phone_number_id = COALESCE(?, phone_number_id),
        business_account_id = COALESCE(?, business_account_id),
        access_token = CASE WHEN ? != '' AND ? IS NOT NULL THEN ? ELSE access_token END,
        webhook_verify_token = COALESCE(?, webhook_verify_token),
        is_connected = COALESCE(?, is_connected),
        updated_at = datetime('now')
    WHERE business_id = ?
  `).run(phone_number_id, business_account_id, access_token, access_token, access_token, webhook_verify_token, is_connected !== undefined ? (is_connected ? 1 : 0) : null, businessId);
    const updated = database_js_1.db.prepare('SELECT * FROM whatsapp_configs WHERE business_id = ?').get(businessId);
    res.json({ success: true, config: updated });
});
// POST /api/whatsapp/test
router.post('/test', authMiddleware_js_1.authenticateToken, async (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { phone, message } = req.body;
    if (!phone || !message) {
        res.status(400).json({ success: false, error: 'Phone and message are required' });
        return;
    }
    const result = await whatsappService_js_1.WhatsAppService.sendMessage({
        business_id: businessId,
        toPhone: phone,
        messageText: message
    });
    res.json({ success: result.success, wa_message_id: result.wa_message_id, error: result.error });
});
// GET /api/whatsapp/messages
router.get('/messages', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { phone, limit = 50 } = req.query;
    let query = 'SELECT * FROM whatsapp_messages WHERE business_id = ?';
    const params = [businessId];
    if (phone) {
        query += ' AND phone = ?';
        params.push(phone);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));
    const messages = database_js_1.db.prepare(query).all(...params);
    res.json({ success: true, messages });
});
exports.default = router;
