"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const axios_1 = __importDefault(require("axios"));
const database_js_1 = require("../db/database.js");
const uuid_1 = require("uuid");
const geminiAiAgent_js_1 = require("./geminiAiAgent.js");
class WhatsAppService {
    /**
     * Get WhatsApp configuration for business
     */
    static getConfig(business_id) {
        return database_js_1.db.prepare('SELECT * FROM whatsapp_configs WHERE business_id = ?').get(business_id);
    }
    /**
     * Replace template variables: {{variable_name}} -> value
     */
    static renderTemplate(content, vars) {
        let result = content;
        for (const [key, val] of Object.entries(vars)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            result = result.replace(regex, String(val));
        }
        return result;
    }
    /**
     * Send WhatsApp text message via Meta Graph API or Mock logger
     */
    static async sendMessage(options) {
        const { business_id, toPhone, messageText, messageType = 'text' } = options;
        const config = this.getConfig(business_id);
        const msgId = `wamid_${(0, uuid_1.v4)().replace(/-/g, '')}`;
        let sendSuccess = true;
        let status = 'SENT';
        let errorMessage;
        // Check if live Meta Cloud API is configured
        const hasLiveCreds = config && config.access_token && config.access_token.startsWith('EAA') && config.phone_number_id;
        if (hasLiveCreds) {
            try {
                const cleanPhone = toPhone.replace(/[^0-9]/g, '');
                const payload = {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanPhone,
                    type: 'text',
                    text: { preview_url: false, body: messageText }
                };
                const res = await axios_1.default.post(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, payload, {
                    headers: {
                        Authorization: `Bearer ${config.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                if (res.data && res.data.messages && res.data.messages[0]) {
                    status = 'SENT';
                }
            }
            catch (err) {
                console.error('WhatsApp API dispatch error:', err?.response?.data || err.message);
                sendSuccess = false;
                status = 'FAILED';
                errorMessage = err?.response?.data?.error?.message || err.message;
            }
        }
        else {
            // Development / Simulator Mode: Mock delivery
            status = 'DELIVERED';
        }
        // Persist message record to DB
        const insertMsg = database_js_1.db.prepare(`
      INSERT INTO whatsapp_messages (
        id, business_id, phone, direction, message_text, message_type, wa_message_id, status, raw_payload
      ) VALUES (?, ?, ?, 'OUTBOUND', ?, ?, ?, ?, ?)
    `);
        insertMsg.run(`msg_${(0, uuid_1.v4)().substring(0, 8)}`, business_id, toPhone, messageText, messageType, msgId, status, errorMessage ? JSON.stringify({ error: errorMessage }) : null);
        // Update contacts table
        database_js_1.db.prepare(`
      INSERT INTO whatsapp_contacts (id, business_id, phone, name, last_message_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(business_id, phone) DO UPDATE SET
        last_message_at = datetime('now')
    `).run(`cnt_${(0, uuid_1.v4)().substring(0, 8)}`, business_id, toPhone, toPhone);
        return { success: sendSuccess, wa_message_id: msgId, error: errorMessage };
    }
    /**
     * Process Inbound Webhook Event from Meta
     */
    static async handleInboundMessage(params) {
        const { business_id, fromPhone, messageText, senderName, waMessageId } = params;
        // 1. Record Inbound Message
        const msgId = waMessageId || `wamid_in_${(0, uuid_1.v4)().substring(0, 12)}`;
        database_js_1.db.prepare(`
      INSERT INTO whatsapp_messages (
        id, business_id, phone, direction, message_text, message_type, wa_message_id, status, raw_payload
      ) VALUES (?, ?, ?, 'INBOUND', ?, 'text', ?, 'READ', ?)
    `).run(`msg_${(0, uuid_1.v4)().substring(0, 8)}`, business_id, fromPhone, messageText, msgId, JSON.stringify({ senderName }));
        // 2. Update Contacts Table
        database_js_1.db.prepare(`
      INSERT INTO whatsapp_contacts (id, business_id, phone, name, last_message_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(business_id, phone) DO UPDATE SET
        name = COALESCE(?, name),
        last_message_at = datetime('now')
    `).run(`cnt_${(0, uuid_1.v4)().substring(0, 8)}`, business_id, fromPhone, senderName || 'WhatsApp Customer', senderName || null);
        // 3. Invoke Gemini AI Booking Agent with Tool Calling
        const aiResponse = await geminiAiAgent_js_1.GeminiAiAgent.processMessage({
            business_id,
            customer_phone: fromPhone,
            customer_name: senderName || 'Valued Customer',
            user_message: messageText
        });
        // 4. Send AI Reply back to WhatsApp
        if (aiResponse.reply) {
            await this.sendMessage({
                business_id,
                toPhone: fromPhone,
                messageText: aiResponse.reply
            });
        }
        return { reply: aiResponse.reply, appointment: aiResponse.appointment };
    }
    /**
     * Trigger an automated template message (e.g. Booking Confirmation, Reminder, Follow-up)
     */
    static async sendAutomatedTemplate(business_id, toPhone, templateType, variables) {
        const tmpl = database_js_1.db.prepare('SELECT * FROM message_templates WHERE business_id = ? AND template_type = ? AND is_active = 1').get(business_id, templateType);
        if (!tmpl) {
            console.warn(`Template not found or inactive: ${templateType}`);
            return false;
        }
        const renderedText = this.renderTemplate(tmpl.content, variables);
        const result = await this.sendMessage({
            business_id,
            toPhone,
            messageText: renderedText,
            messageType: templateType
        });
        return result.success;
    }
}
exports.WhatsAppService = WhatsAppService;
