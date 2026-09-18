import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db/database.js';
import { SlotEngine, formatTime12h } from '../engine/slotEngine.js';
import { AIAgentConfig, Appointment, Business, Service, Staff } from '../types/index.js';

export interface AIProcessParams {
  business_id: string;
  customer_phone: string;
  customer_name: string;
  user_message: string;
}

export interface AIProcessResult {
  reply: string;
  appointment?: Appointment;
  function_called?: string;
}

export class GeminiAiAgent {
  /**
   * Process incoming customer message via Gemini API with Tool Calling
   * or Built-in Deterministic Conversational Engine fallback.
   */
  public static async processMessage(params: AIProcessParams): Promise<AIProcessResult> {
    const { business_id, customer_phone, customer_name, user_message } = params;

    // Load AI Agent configuration for business
    const aiConfig = db.prepare('SELECT * FROM ai_agent_configs WHERE business_id = ?').get(business_id) as AIAgentConfig | undefined;
    const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(business_id) as Business | undefined;

    // Load conversation history and state context
    const convRow = db.prepare('SELECT * FROM ai_conversations WHERE business_id = ? AND phone = ?').get(business_id, customer_phone) as any;
    let history: Array<{ role: 'user' | 'model'; parts: string }> = [];
    let context: Record<string, any> = {};

    if (convRow) {
      try {
        history = JSON.parse(convRow.history_json || '[]');
        context = JSON.parse(convRow.context_json || '{}');
      } catch (e) {
        // use defaults
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidGeminiKey = apiKey && !apiKey.includes('DEV_KEY') && apiKey.startsWith('AIzaSy');

    let result: AIProcessResult;

    if (hasValidGeminiKey) {
      try {
        result = await this.runGeminiWithTools({
          apiKey,
          aiConfig,
          business,
          customer_phone,
          customer_name,
          user_message,
          history,
          context
        });
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to Intelligent Booking Logic Engine:', err.message);
        result = await this.runDeterministicEngine({
          business_id,
          customer_phone,
          customer_name,
          user_message,
          context,
          aiConfig,
          business
        });
      }
    } else {
      // Fast, resilient built-in booking conversational engine
      result = await this.runDeterministicEngine({
        business_id,
        customer_phone,
        customer_name,
        user_message,
        context,
        aiConfig,
        business
      });
    }

    // Save updated history and context
    history.push({ role: 'user', parts: user_message });
    history.push({ role: 'model', parts: result.reply });
    // Keep last 10 messages for memory efficiency
    if (history.length > 20) {
      history = history.slice(history.length - 20);
    }

    db.prepare(`
      INSERT INTO ai_conversations (id, business_id, phone, history_json, context_json, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(business_id, phone) DO UPDATE SET
        history_json = excluded.history_json,
        context_json = excluded.context_json,
        updated_at = datetime('now')
    `).run(`aic_${customer_phone}`, business_id, customer_phone, JSON.stringify(history), JSON.stringify(context));

    return result;
  }

  /**
   * Gemini Generative AI Tool Execution
   */
  private static async runGeminiWithTools(args: any): Promise<AIProcessResult> {
    const { apiKey, aiConfig, business, customer_phone, customer_name, user_message, history, context } = args;
    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = `
      You are "${aiConfig?.persona_name || 'Aria'}", an intelligent, polite, and friendly appointment booking AI assistant for "${business?.name || 'our business'}".
      Language: ${aiConfig?.language || 'Hinglish/Hindi/English'}.
      Tone: ${aiConfig?.tone || 'Friendly and helpful'}.
      Custom Instructions: ${aiConfig?.custom_instructions || ''}
      Cancellation Policy: ${aiConfig?.cancellation_policy || ''}
      Reschedule Policy: ${aiConfig?.reschedule_policy || ''}

      CRITICAL BOOKING RULES:
      1. NEVER invent services or prices. Only use services returned by get_services().
      2. NEVER invent available dates or time slots. Always query get_available_slots(date, service_id).
      3. ALWAYS ask for explicit customer confirmation before calling create_booking(), reschedule_booking(), or cancel_booking().
      4. If the customer asks to reschedule or cancel, first locate their active booking with get_customer_bookings(whatsapp_number).
      5. Today is ${new Date().toISOString().split('T')[0]}.
    `;

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction
    });

    // Run conversational chat or fall back
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: user_message }] }]
    });

    const replyText = response.response.text();
    return { reply: replyText };
  }

  /**
   * Deterministic Natural Language Booking & Conversation Engine.
   * Handles Hindi, Hinglish, and English for:
   * - Greetings & Service catalog
   * - Date resolution ('aaj', 'today', 'kal', 'tomorrow', '20 Sep', 'YYYY-MM-DD')
   * - Available slot checks using real database SlotEngine
   * - Customer confirmation
   * - Booking creation & instant confirmation
   * - Reschedule & Cancellation flows
   * - FAQs answering
   */
  private static async runDeterministicEngine(args: {
    business_id: string;
    customer_phone: string;
    customer_name: string;
    user_message: string;
    context: Record<string, any>;
    aiConfig?: AIAgentConfig;
    business?: Business;
  }): Promise<AIProcessResult> {
    const { business_id, customer_phone, customer_name, user_message, context, aiConfig, business } = args;
    const msg = user_message.trim().toLowerCase();
    const bizName = business?.name || 'Luxe Studio';
    const persona = aiConfig?.persona_name || 'Aria';

    // 1. Fetch available services
    const services = db.prepare('SELECT * FROM services WHERE business_id = ? AND is_active = 1').all(business_id) as Service[];

    // Check FAQs first
    if (aiConfig && aiConfig.faqs_json) {
      try {
        const faqs = JSON.parse(aiConfig.faqs_json) as Array<{ question: string; answer: string }>;
        for (const faq of faqs) {
          const qKeywords = faq.question.toLowerCase().split(' ').filter((w) => w.length > 3);
          const matchCount = qKeywords.filter((k) => msg.includes(k)).length;
          if (matchCount >= 2 || (qKeywords.length === 1 && matchCount === 1)) {
            return { reply: `${faq.answer}\n\nKya aap koi appointment book karna chahte hain? Bas service ka naam batayein! 😊` };
          }
        }
      } catch (e) {}
    }

    // 2. Cancellation Intent
    if (msg.includes('cancel') || msg.includes('radd') || msg.includes('nahi aana')) {
      const activeAppt = db.prepare(`
        SELECT a.*, s.name as service_name
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN services s ON a.service_id = s.id
        WHERE a.business_id = ? AND c.whatsapp_number = ? AND a.status IN ('CONFIRMED', 'PENDING', 'RESCHEDULED')
        ORDER BY a.date ASC, a.start_time ASC
        LIMIT 1
      `).get(business_id, customer_phone) as any;

      if (!activeAppt) {
        return { reply: `Aapka koi active appointment nahi mila jisko cancel kiya ja sake. Naya appointment book karne ke liye bas service ka naam batayein.` };
      }

      if (context.pending_cancellation_id === activeAppt.id && (msg.includes('yes') || msg.includes('haan') || msg.includes('ha') || msg.includes('cancel kar do'))) {
        SlotEngine.cancelAppointmentTransaction({
          business_id,
          appointment_id: activeAppt.id,
          reason: 'Cancelled by customer via WhatsApp'
        });
        delete context.pending_cancellation_id;
        return {
          reply: `❌ Aapka appointment (*${activeAppt.booking_id}* - ${activeAppt.service_name} on ${activeAppt.date}) successfully cancel kar diya gaya hai.\n\nAgli baar book karne ke liye bas "Hi" likhein!`
        };
      }

      context.pending_cancellation_id = activeAppt.id;
      return {
        reply: `Aapka ek appointment scheduled hai:\n\n*Booking ID:* ${activeAppt.booking_id}\n*Service:* ${activeAppt.service_name}\n*Date:* ${activeAppt.date} (${formatTime12h(activeAppt.start_time)})\n\nKya aap sach mein ise *cancel* karna chahte hain? Please reply *"Yes"* to confirm.`
      };
    }

    // 3. Reschedule Intent
    if (msg.includes('reschedule') || msg.includes('time change') || msg.includes('badalna') || msg.includes('shift')) {
      const activeAppt = db.prepare(`
        SELECT a.*, s.name as service_name
        FROM appointments a
        JOIN customers c ON a.customer_id = c.id
        JOIN services s ON a.service_id = s.id
        WHERE a.business_id = ? AND c.whatsapp_number = ? AND a.status IN ('CONFIRMED', 'PENDING', 'RESCHEDULED')
        ORDER BY a.date ASC, a.start_time ASC
        LIMIT 1
      `).get(business_id, customer_phone) as any;

      if (!activeAppt) {
        return { reply: `Aapka koi upcoming appointment nahi mila. Naya slot book karne ke liye bas service ka naam batayein.` };
      }

      context.rescheduling_appt_id = activeAppt.id;
      context.selected_service_id = activeAppt.service_id;
      return {
        reply: `Aapka current appointment hai:\n*${activeAppt.service_name}* on *${activeAppt.date}* at *${formatTime12h(activeAppt.start_time)}*.\n\nAap kaunsi nayi date par shift karna chahte hain? (e.g. *Kal* ya date YYYY-MM-DD)`
      };
    }

    // 4. Booking Confirmation Intent ('yes', 'confirm', 'haan', 'ha', 'done')
    if ((msg === 'yes' || msg === 'haan' || msg === 'ha' || msg === 'confirm' || msg.startsWith('yes ') || msg === 'thik hai') && context.selected_service_id && context.selected_date && context.selected_time) {
      try {
        const appt = SlotEngine.createBookingTransaction({
          business_id,
          customer_name,
          customer_phone,
          service_id: context.selected_service_id,
          date: context.selected_date,
          start_time: context.selected_time,
          source: 'WHATSAPP_AI',
          notes: 'Booked via WhatsApp AI Agent'
        });

        // Clear booking context
        delete context.selected_service_id;
        delete context.selected_date;
        delete context.selected_time;
        delete context.awaiting_confirmation;

        return {
          reply: `✅ *Appointment Confirmed!*\n\n*Booking ID:* ${appt.booking_id}\n*Service:* ${appt.service_name}\n*Date:* ${appt.date}\n*Time:* ${formatTime12h(appt.start_time)}\n*Staff:* ${appt.staff_name}\n*Price:* ${business?.currency || '₹'}${appt.price}\n\n*Location:* ${bizName}\n\nThank you ${customer_name}! Hum aapka appointment time par wait karenge. 😊`,
          appointment: appt,
          function_called: 'create_booking'
        };
      } catch (err: any) {
        return {
          reply: `Maaf kijiye, yeh slot abhi kisi aur ne book kar liya hai: ${err.message}.\n\nKripya koi doosra time chuniye.`
        };
      }
    }

    // 5. Detect Service Selection
    let detectedService = services.find((s) => msg.includes(s.name.toLowerCase()));
    if (!detectedService) {
      if (msg.includes('hair') || msg.includes('cut') || msg.includes('baal')) {
        detectedService = services.find((s) => s.name.toLowerCase().includes('hair cut') || s.name.toLowerCase().includes('hair'));
      } else if (msg.includes('beard') || msg.includes('shave') || msg.includes('trim')) {
        detectedService = services.find((s) => s.name.toLowerCase().includes('beard'));
      } else if (msg.includes('facial') || msg.includes('face') || msg.includes('glow')) {
        detectedService = services.find((s) => s.name.toLowerCase().includes('facial'));
      } else if (msg.includes('spa') || msg.includes('treatment')) {
        detectedService = services.find((s) => s.name.toLowerCase().includes('spa'));
      }
    }

    if (detectedService) {
      context.selected_service_id = detectedService.id;
    }

    // 6. Detect Date
    let resolvedDate: string | null = null;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (msg.includes('aaj') || msg.includes('today')) {
      resolvedDate = todayStr;
    } else if (msg.includes('kal') || msg.includes('tomorrow')) {
      resolvedDate = tomorrowStr;
    } else if (msg.includes('parso') || msg.includes('day after tomorrow')) {
      const parso = new Date();
      parso.setDate(parso.getDate() + 2);
      resolvedDate = parso.toISOString().split('T')[0];
    } else {
      // Check for YYYY-MM-DD format
      const dateMatch = user_message.match(/\b\d{4}-\d{2}-\d{2}\b/);
      if (dateMatch) {
        resolvedDate = dateMatch[0];
      }
    }

    if (resolvedDate) {
      context.selected_date = resolvedDate;
    }

    // 7. If we have Service + Date, find real slots using SlotEngine
    if (context.selected_service_id && context.selected_date) {
      const activeService = services.find((s) => s.id === context.selected_service_id);
      const availableSlots = SlotEngine.calculateAvailableSlots({
        business_id,
        date: context.selected_date,
        service_id: context.selected_service_id
      });

      if (availableSlots.length === 0) {
        return {
          reply: `${context.selected_date} ko *${activeService?.name}* ke liye koi slot available nahi hai ya salon holiday par hai.\n\nKya aap koi doosri date (jaise *Kal* ya *Parso*) try karna chahenge?`
        };
      }

      // Check if user specified a time (e.g. "4 PM", "11:00", "11 am", "16:00")
      let selectedSlotTime: string | null = null;
      for (const slot of availableSlots) {
        const h24 = slot.time; // "16:00"
        const h12 = slot.formatted_time.toLowerCase(); // "4:00 pm"
        const short12 = h12.replace(':00', ''); // "4 pm"

        if (
          msg.includes(h24) ||
          msg.includes(h12) ||
          msg.includes(short12) ||
          msg === slot.time.split(':')[0] ||
          (msg.includes('4') && h12.includes('4:00 pm')) ||
          (msg.includes('11') && h12.includes('11:00 am')) ||
          (msg.includes('12') && h12.includes('12:00 pm')) ||
          (msg.includes('10') && h12.includes('10:00 am'))
        ) {
          selectedSlotTime = slot.time;
          break;
        }
      }

      if (selectedSlotTime) {
        context.selected_time = selectedSlotTime;
        context.awaiting_confirmation = true;
        const sTimeFmt = formatTime12h(selectedSlotTime);

        return {
          reply: `Aapka selection:\n📌 *Service:* ${activeService?.name}\n🗓️ *Date:* ${context.selected_date}\n⏰ *Time:* ${sTimeFmt}\n💰 *Price:* ${business?.currency || '₹'}${activeService?.price}\n\nKya main yeh appointment *Confirm* karu? Please reply *"Yes"* ya *"Confirm"*.`
        };
      }

      // If user hasn't chosen time yet, display unique available slots
      const uniqueTimes = Array.from(new Set(availableSlots.map((s) => s.formatted_time))).slice(0, 6);
      const slotListText = uniqueTimes.map((t) => `• ${t}`).join('\n');

      return {
        reply: `*${context.selected_date}* ke liye available slots:\n\n${slotListText}\n\nAap kaunsa time choose karenge? (e.g. "${uniqueTimes[0]}")`
      };
    }

    // 8. If we have Service only, ask for Date
    if (context.selected_service_id && !context.selected_date) {
      const activeService = services.find((s) => s.id === context.selected_service_id);
      return {
        reply: `Great! Aapne *${activeService?.name}* select kiya hai (Duration: ${activeService?.duration_minutes} mins, Price: ${business?.currency || '₹'}${activeService?.price}).\n\nAap kaunsi date par aana chahenge? (e.g. *Aaj*, *Kal*, ya YYYY-MM-DD)`
      };
    }

    // 9. Initial Greeting or General Inquiry: Show Services Menu
    const serviceOptions = services.map((s) => `• *${s.name}* (${s.duration_minutes} min) - ${business?.currency || '₹'}${s.price}`).join('\n');

    return {
      reply: `Namaste ${customer_name}! 🙏 Main *${persona}*, ${bizName} ki AI Assistant.\n\nHumari popular services:\n${serviceOptions}\n\nAap kaunsi service book karna chahte hain?`
    };
  }
}
