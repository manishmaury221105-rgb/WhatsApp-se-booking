"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationWorker = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const database_js_1 = require("../db/database.js");
const whatsappService_js_1 = require("./whatsappService.js");
const slotEngine_js_1 = require("../engine/slotEngine.js");
class AutomationWorker {
    static task = null;
    static start() {
        if (this.task)
            return;
        console.log('Starting Automation & Reminder Worker (node-cron)...');
        // Run every minute
        this.task = node_cron_1.default.schedule('* * * * *', async () => {
            await this.processReminders();
        });
    }
    static stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
        }
    }
    /**
     * Process 24-hour and 2-hour appointment reminders
     */
    static async processReminders() {
        const now = new Date();
        let sent24h = 0;
        let sent2h = 0;
        try {
            // Find all upcoming active appointments
            const upcomingAppts = database_js_1.db.prepare(`
        SELECT a.*, c.name as customer_name, c.whatsapp_number as customer_phone,
               s.name as service_name, st.name as staff_name, b.name as business_name, b.currency
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN services s ON a.service_id = s.id
        JOIN staff st ON a.staff_id = st.id
        JOIN businesses b ON a.business_id = b.id
        WHERE a.status IN ('CONFIRMED', 'RESCHEDULED')
      `).all();
            for (const appt of upcomingAppts) {
                // Parse appointment datetime
                const apptDateStr = `${appt.date}T${appt.start_time}:00`;
                const apptTime = new Date(apptDateStr).getTime();
                if (isNaN(apptTime))
                    continue;
                const diffMinutes = Math.round((apptTime - now.getTime()) / (1000 * 60));
                // 1. Check 24-Hour Reminder (Between 1400 and 1460 minutes away = ~23.5 - 24.5 hours)
                if (diffMinutes >= 1380 && diffMinutes <= 1500 && appt.reminder_24h_sent === 0) {
                    const success = await whatsappService_js_1.WhatsAppService.sendAutomatedTemplate(appt.business_id, appt.customer_phone, 'REMINDER_24H', {
                        customer_name: appt.customer_name,
                        date: appt.date,
                        time: (0, slotEngine_js_1.formatTime12h)(appt.start_time),
                        service_name: appt.service_name,
                        staff_name: appt.staff_name,
                        business_name: appt.business_name
                    });
                    if (success) {
                        database_js_1.db.prepare('UPDATE appointments SET reminder_24h_sent = 1 WHERE id = ?').run(appt.id);
                        sent24h++;
                    }
                }
                // 2. Check 2-Hour Reminder (Between 110 and 130 minutes away = ~1.8 - 2.2 hours)
                if (diffMinutes >= 100 && diffMinutes <= 130 && appt.reminder_2h_sent === 0) {
                    const success = await whatsappService_js_1.WhatsAppService.sendAutomatedTemplate(appt.business_id, appt.customer_phone, 'REMINDER_2H', {
                        customer_name: appt.customer_name,
                        time: (0, slotEngine_js_1.formatTime12h)(appt.start_time),
                        business_name: appt.business_name
                    });
                    if (success) {
                        database_js_1.db.prepare('UPDATE appointments SET reminder_2h_sent = 1 WHERE id = ?').run(appt.id);
                        sent2h++;
                    }
                }
            }
        }
        catch (err) {
            console.error('Error during AutomationWorker processReminders:', err.message);
        }
        return { reminders_24h: sent24h, reminders_2h: sent2h };
    }
}
exports.AutomationWorker = AutomationWorker;
