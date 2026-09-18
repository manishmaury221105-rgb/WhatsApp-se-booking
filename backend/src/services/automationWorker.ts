import cron from 'node-cron';
import { db } from '../db/database.js';
import { Appointment } from '../types/index.js';
import { WhatsAppService } from './whatsappService.js';
import { formatTime12h } from '../engine/slotEngine.js';

export class AutomationWorker {
  private static task: any = null;

  public static start() {
    if (this.task) return;

    console.log('Starting Automation & Reminder Worker (node-cron)...');
    // Run every minute
    this.task = cron.schedule('* * * * *', async () => {
      await this.processReminders();
    });
  }

  public static stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }

  /**
   * Process 24-hour and 2-hour appointment reminders
   */
  public static async processReminders(): Promise<{ reminders_24h: number; reminders_2h: number }> {
    const now = new Date();
    let sent24h = 0;
    let sent2h = 0;

    try {
      // Find all upcoming active appointments
      const upcomingAppts = db.prepare(`
        SELECT a.*, c.name as customer_name, c.whatsapp_number as customer_phone,
               s.name as service_name, st.name as staff_name, b.name as business_name, b.currency
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN services s ON a.service_id = s.id
        JOIN staff st ON a.staff_id = st.id
        JOIN businesses b ON a.business_id = b.id
        WHERE a.status IN ('CONFIRMED', 'RESCHEDULED')
      `).all() as any[];

      for (const appt of upcomingAppts) {
        // Parse appointment datetime
        const apptDateStr = `${appt.date}T${appt.start_time}:00`;
        const apptTime = new Date(apptDateStr).getTime();
        if (isNaN(apptTime)) continue;

        const diffMinutes = Math.round((apptTime - now.getTime()) / (1000 * 60));

        // 1. Check 24-Hour Reminder (Between 1400 and 1460 minutes away = ~23.5 - 24.5 hours)
        if (diffMinutes >= 1380 && diffMinutes <= 1500 && appt.reminder_24h_sent === 0) {
          const success = await WhatsAppService.sendAutomatedTemplate(
            appt.business_id,
            appt.customer_phone,
            'REMINDER_24H',
            {
              customer_name: appt.customer_name,
              date: appt.date,
              time: formatTime12h(appt.start_time),
              service_name: appt.service_name,
              staff_name: appt.staff_name,
              business_name: appt.business_name
            }
          );

          if (success) {
            db.prepare('UPDATE appointments SET reminder_24h_sent = 1 WHERE id = ?').run(appt.id);
            sent24h++;
          }
        }

        // 2. Check 2-Hour Reminder (Between 110 and 130 minutes away = ~1.8 - 2.2 hours)
        if (diffMinutes >= 100 && diffMinutes <= 130 && appt.reminder_2h_sent === 0) {
          const success = await WhatsAppService.sendAutomatedTemplate(
            appt.business_id,
            appt.customer_phone,
            'REMINDER_2H',
            {
              customer_name: appt.customer_name,
              time: formatTime12h(appt.start_time),
              business_name: appt.business_name
            }
          );

          if (success) {
            db.prepare('UPDATE appointments SET reminder_2h_sent = 1 WHERE id = ?').run(appt.id);
            sent2h++;
          }
        }
      }
    } catch (err: any) {
      console.error('Error during AutomationWorker processReminders:', err.message);
    }

    return { reminders_24h: sent24h, reminders_2h: sent2h };
  }
}
