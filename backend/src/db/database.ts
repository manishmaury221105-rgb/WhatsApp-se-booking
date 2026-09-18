import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../whatsapp_booking.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable Foreign Keys and WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('ADMIN', 'STAFF')) NOT NULL DEFAULT 'STAFF',
      name TEXT NOT NULL,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT,
      phone TEXT NOT NULL,
      whatsapp_number TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      currency TEXT NOT NULL DEFAULT '₹',
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_hours (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      is_open INTEGER NOT NULL DEFAULT 1,
      open_time TEXT NOT NULL DEFAULT '09:00',
      close_time TEXT NOT NULL DEFAULT '20:00',
      break_start TEXT,
      break_end TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      UNIQUE(business_id, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      price REAL NOT NULL DEFAULT 0.0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      profile_photo TEXT,
      working_days TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]',
      working_hours_start TEXT NOT NULL DEFAULT '10:00',
      working_hours_end TEXT NOT NULL DEFAULT '19:00',
      break_start TEXT DEFAULT '13:00',
      break_end TEXT DEFAULT '14:00',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS staff_services (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
      UNIQUE(staff_id, service_id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      whatsapp_number TEXT NOT NULL,
      email TEXT,
      total_bookings INTEGER NOT NULL DEFAULT 0,
      completed_bookings INTEGER NOT NULL DEFAULT 0,
      cancelled_bookings INTEGER NOT NULL DEFAULT 0,
      noshow_bookings INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      UNIQUE(business_id, whatsapp_number)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL,
      business_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT CHECK(status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED')) NOT NULL DEFAULT 'CONFIRMED',
      source TEXT CHECK(source IN ('WHATSAPP_AI', 'ADMIN', 'MANUAL')) NOT NULL DEFAULT 'WHATSAPP_AI',
      notes TEXT,
      noshow_reason TEXT,
      noshow_time TEXT,
      noshow_marked_by TEXT,
      cancelled_at TEXT,
      reminder_24h_sent INTEGER NOT NULL DEFAULT 0,
      reminder_2h_sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS blocked_slots (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      staff_id TEXT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      UNIQUE(business_id, date)
    );

    CREATE TABLE IF NOT EXISTS staff_leaves (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) NOT NULL DEFAULT 'APPROVED',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_templates (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      template_type TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      variables TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      UNIQUE(business_id, template_type)
    );

    CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      event_trigger TEXT NOT NULL,
      template_id TEXT,
      delay_minutes INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      data_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_id TEXT,
      phone TEXT NOT NULL,
      direction TEXT CHECK(direction IN ('INBOUND', 'OUTBOUND')) NOT NULL,
      message_text TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      wa_message_id TEXT,
      status TEXT CHECK(status IN ('SENT', 'DELIVERED', 'READ', 'FAILED')) NOT NULL DEFAULT 'SENT',
      raw_payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS whatsapp_contacts (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      name TEXT,
      last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      UNIQUE(business_id, phone)
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      history_json TEXT NOT NULL DEFAULT '[]',
      context_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      UNIQUE(business_id, phone)
    );

    CREATE TABLE IF NOT EXISTS ai_agent_configs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL UNIQUE,
      persona_name TEXT NOT NULL DEFAULT 'Aria',
      language TEXT NOT NULL DEFAULT 'Hinglish',
      tone TEXT NOT NULL DEFAULT 'Friendly',
      faqs_json TEXT NOT NULL DEFAULT '[]',
      cancellation_policy TEXT NOT NULL DEFAULT 'Appointments can be cancelled up to 2 hours before the scheduled time.',
      reschedule_policy TEXT NOT NULL DEFAULT 'Rescheduling is free when done at least 1 hour in advance.',
      custom_instructions TEXT NOT NULL DEFAULT 'Customer se polite, helpful aur friendly Hinglish/Hindi mein baat karo. Direct real-time services aur real slots offer karo.',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS whatsapp_configs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL UNIQUE,
      phone_number_id TEXT NOT NULL DEFAULT '123456789012345',
      business_account_id TEXT NOT NULL DEFAULT '987654321098765',
      access_token TEXT NOT NULL DEFAULT '',
      webhook_verify_token TEXT NOT NULL DEFAULT 'whatsapp_booking_webhook_verify_token_2026',
      is_connected INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- Create Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON appointments(business_id, date);
    CREATE INDEX IF NOT EXISTS idx_appointments_staff_date ON appointments(staff_id, date);
    CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(business_id, whatsapp_number);
    CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots(business_id, date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_wa_messages_phone ON whatsapp_messages(business_id, phone);
  `);

  seedDefaultData();
}

function seedDefaultData() {
  const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (existingUser) return;

  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const staffPasswordHash = bcrypt.hashSync('staff123', 10);

  const businessId = 'biz_default_01';
  const adminUserId = 'user_admin_01';
  const staffUserId1 = 'user_staff_01';
  const staffUserId2 = 'user_staff_02';

  const staffId1 = 'staff_01';
  const staffId2 = 'staff_02';
  const staffId3 = 'staff_03';

  const serviceId1 = 'srv_01';
  const serviceId2 = 'srv_02';
  const serviceId3 = 'srv_03';
  const serviceId4 = 'srv_04';

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, role, name, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(adminUserId, 'admin@salon.com', adminPasswordHash, 'ADMIN', 'Vikram Singh (Admin)', '+919876543210');
  insertUser.run(staffUserId1, 'rahul@salon.com', staffPasswordHash, 'STAFF', 'Rahul Sharma', '+919876543211');
  insertUser.run(staffUserId2, 'priya@salon.com', staffPasswordHash, 'STAFF', 'Priya Patel', '+919876543212');

  const insertBiz = db.prepare(`
    INSERT INTO businesses (id, name, logo_url, phone, whatsapp_number, email, address, timezone, currency, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertBiz.run(
    businessId,
    'Luxe Salon & Spa Studio',
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&auto=format&fit=crop',
    '+919876543210',
    '+919876543210',
    'support@luxesalon.com',
    'Shop 14, High Street Mall, Bandra West, Mumbai, MH 400050',
    'Asia/Kolkata',
    '₹',
    'Premium Hair, Skin, and Grooming services for men and women with instant AI booking on WhatsApp.'
  );

  // Business Hours (0=Sun to 6=Sat)
  const insertHours = db.prepare(`
    INSERT INTO business_hours (id, business_id, day_of_week, is_open, open_time, close_time, break_start, break_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (let day = 0; day <= 6; day++) {
    const isOpen = day === 0 ? 1 : 1; // Open all 7 days
    insertHours.run(`bh_${day}`, businessId, day, isOpen, '09:00', '21:00', '13:30', '14:30');
  }

  // Services
  const insertService = db.prepare(`
    INSERT INTO services (id, business_id, name, description, duration_minutes, price, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertService.run(serviceId1, businessId, 'Hair Cut & Styling', 'Precision haircut including shampoo, conditioning, and blow dry finish.', 30, 350.0, 1);
  insertService.run(serviceId2, businessId, 'Beard Grooming & Shape', 'Royal hot towel shave, beard trimming, styling and organic oil massage.', 20, 200.0, 1);
  insertService.run(serviceId3, businessId, 'Luxe Hair Spa & Treatment', 'Deep conditioning hair spa for damage repair and scalp rejuvenation.', 45, 800.0, 1);
  insertService.run(serviceId4, businessId, 'Hydra Glow Facial', 'Refreshing deep pore cleansing, exfoliation, and brightening facial glow mask.', 60, 1200.0, 1);

  // Staff
  const insertStaff = db.prepare(`
    INSERT INTO staff (id, business_id, user_id, name, phone, email, profile_photo, working_days, working_hours_start, working_hours_end, break_start, break_end, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStaff.run(
    staffId1,
    businessId,
    staffUserId1,
    'Rahul Sharma',
    '+919876543211',
    'rahul@salon.com',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    '[1,2,3,4,5,6,0]',
    '10:00',
    '19:00',
    '13:00',
    '14:00',
    1
  );
  insertStaff.run(
    staffId2,
    businessId,
    staffUserId2,
    'Priya Patel',
    '+919876543212',
    'priya@salon.com',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    '[1,2,3,4,5,6]',
    '11:00',
    '20:00',
    '14:00',
    '15:00',
    1
  );
  insertStaff.run(
    staffId3,
    businessId,
    null,
    'Amit Verma',
    '+919876543213',
    'amit@salon.com',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    '[1,2,3,4,5,0]',
    '09:30',
    '18:30',
    '13:30',
    '14:30',
    1
  );

  // Staff Services
  const insertStaffService = db.prepare(`
    INSERT INTO staff_services (id, staff_id, service_id)
    VALUES (?, ?, ?)
  `);
  insertStaffService.run('ss_1', staffId1, serviceId1);
  insertStaffService.run('ss_2', staffId1, serviceId2);
  insertStaffService.run('ss_3', staffId1, serviceId3);
  insertStaffService.run('ss_4', staffId2, serviceId1);
  insertStaffService.run('ss_5', staffId2, serviceId3);
  insertStaffService.run('ss_6', staffId2, serviceId4);
  insertStaffService.run('ss_7', staffId3, serviceId1);
  insertStaffService.run('ss_8', staffId3, serviceId2);

  // Message Templates
  const insertTemplate = db.prepare(`
    INSERT INTO message_templates (id, business_id, template_type, name, content, variables, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertTemplate.run(
    'tmpl_01',
    businessId,
    'BOOKING_CONFIRMATION',
    'Booking Confirmation',
    '✅ *Appointment Confirmed!*\n\n*Booking ID:* {{booking_id}}\n*Service:* {{service_name}}\n*Date:* {{date}}\n*Time:* {{time}}\n*Staff:* {{staff_name}}\n*Price:* {{price}}\n\n*Location:* {{business_name}}\n\nThank you for choosing us! Looking forward to seeing you. 😊',
    JSON.stringify(['booking_id', 'service_name', 'date', 'time', 'staff_name', 'price', 'business_name']),
    1
  );
  insertTemplate.run(
    'tmpl_02',
    businessId,
    'REMINDER_24H',
    '24-Hour Reminder',
    '🔔 *Appointment Reminder*\n\nHi {{customer_name}}, aapka appointment kal {{date}} ko *{{time}}* par {{service_name}} ke liye scheduled hai with {{staff_name}}.\n\nKoi change ho toh yahan reply karein.',
    JSON.stringify(['customer_name', 'date', 'time', 'service_name', 'staff_name']),
    1
  );
  insertTemplate.run(
    'tmpl_03',
    businessId,
    'REMINDER_2H',
    '2-Hour Reminder',
    '🔔 *Reminder*\n\nHi {{customer_name}}, aapka appointment *2 hours* mein ({{time}}) scheduled hai at {{business_name}}.\n\nHum aapka wait kar rahe hain!',
    JSON.stringify(['customer_name', 'time', 'business_name']),
    1
  );
  insertTemplate.run(
    'tmpl_04',
    businessId,
    'RESCHEDULE',
    'Reschedule Confirmation',
    '🗓️ *Appointment Rescheduled*\n\n*Booking ID:* {{booking_id}}\n*New Date:* {{date}}\n*New Time:* {{time}}\n*Service:* {{service_name}}\n*Staff:* {{staff_name}}\n\nSee you soon at {{business_name}}!',
    JSON.stringify(['booking_id', 'date', 'time', 'service_name', 'staff_name', 'business_name']),
    1
  );
  insertTemplate.run(
    'tmpl_05',
    businessId,
    'CANCELLATION',
    'Cancellation Notice',
    '❌ *Appointment Cancelled*\n\n*Booking ID:* {{booking_id}}\n*Service:* {{service_name}}\n*Date:* {{date}}\n\nAapka appointment successfully cancel kar diya gaya hai. Agli baar book karne ke liye bas "Hi" bhejein!',
    JSON.stringify(['booking_id', 'service_name', 'date']),
    1
  );
  insertTemplate.run(
    'tmpl_06',
    businessId,
    'FEEDBACK',
    'Post-Service Feedback',
    '⭐ *Thank you for visiting {{business_name}}!* 😊\n\n{{customer_name}}, aapka {{service_name}} experience kaisa raha?\n\nPlease apna feedback share karein: 1 (Poor) se 5 (Excellent) ⭐',
    JSON.stringify(['business_name', 'customer_name', 'service_name']),
    1
  );

  // Automation Rules
  const insertAutomation = db.prepare(`
    INSERT INTO automation_rules (id, business_id, event_trigger, template_id, delay_minutes, is_enabled)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertAutomation.run('auto_01', businessId, 'NEW_BOOKING', 'tmpl_01', 0, 1);
  insertAutomation.run('auto_02', businessId, 'REMINDER_24H', 'tmpl_02', 0, 1);
  insertAutomation.run('auto_03', businessId, 'REMINDER_2H', 'tmpl_03', 0, 1);
  insertAutomation.run('auto_04', businessId, 'APPOINTMENT_COMPLETED', 'tmpl_06', 15, 1);
  insertAutomation.run('auto_05', businessId, 'APPOINTMENT_CANCELLED', 'tmpl_05', 0, 1);

  // AI Agent Config
  const insertAIConfig = db.prepare(`
    INSERT INTO ai_agent_configs (id, business_id, persona_name, language, tone, faqs_json, cancellation_policy, reschedule_policy, custom_instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const faqs = [
    { question: 'What are your working hours?', answer: 'We are open all 7 days from 9:00 AM to 9:00 PM.' },
    { question: 'Where are you located?', answer: 'Shop 14, High Street Mall, Bandra West, Mumbai.' },
    { question: 'What payment methods do you accept?', answer: 'We accept UPI (GPay, PhonePe, Paytm), Cash, and Credit/Debit Cards.' },
    { question: 'Is parking available?', answer: 'Yes, free valet parking is available at the mall entrance.' }
  ];
  insertAIConfig.run(
    'ai_cfg_01',
    businessId,
    'Aria',
    'Hinglish',
    'Friendly',
    JSON.stringify(faqs),
    'Appointments can be cancelled up to 2 hours before scheduled time without any fee.',
    'Rescheduling is instant and free up to 1 hour before scheduled time.',
    'Talk in friendly, polite Hindi/Hinglish. Use emojis. Never hallucinate unavailable slots or non-existing services. Always verify available slots using get_available_slots tool before promising a time.'
  );

  // WhatsApp Config
  const insertWAConfig = db.prepare(`
    INSERT INTO whatsapp_configs (id, business_id, phone_number_id, business_account_id, access_token, webhook_verify_token, is_connected)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertWAConfig.run(
    'wa_cfg_01',
    businessId,
    '123456789012345',
    '987654321098765',
    'EAAB_TEST_TOKEN_DEMO',
    'whatsapp_booking_webhook_verify_token_2026',
    1
  );

  // Sample Customers
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, business_id, name, whatsapp_number, email, total_bookings, completed_bookings, cancelled_bookings, noshow_bookings, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCustomer.run('cust_01', businessId, 'Rohan Mehta', '+919820012345', 'rohan.m@gmail.com', 4, 3, 0, 0, 'Prefers Rahul for styling.');
  insertCustomer.run('cust_02', businessId, 'Ananya Sharma', '+919820067890', 'ananya.s@gmail.com', 2, 2, 0, 0, 'Sensitive skin for facial treatments.');
  insertCustomer.run('cust_03', businessId, 'Karan Kapoor', '+919820099887', 'karan.k@yahoo.com', 1, 0, 1, 0, 'WhatsApp AI booking.');

  // Today and Tomorrow dynamic dates for realistic calendar
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const insertAppt = db.prepare(`
    INSERT INTO appointments (id, booking_id, business_id, customer_id, service_id, staff_id, date, start_time, end_time, price, status, source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAppt.run('appt_01', 'BK1024', businessId, 'cust_01', serviceId1, staffId1, todayStr, '11:00', '11:30', 350.0, 'CONFIRMED', 'WHATSAPP_AI', 'Booked via WhatsApp AI Aria');
  insertAppt.run('appt_02', 'BK1025', businessId, 'cust_02', serviceId4, staffId2, todayStr, '15:00', '16:00', 1200.0, 'CONFIRMED', 'ADMIN', 'VIP Customer booking');
  insertAppt.run('appt_03', 'BK1026', businessId, 'cust_01', serviceId2, staffId1, tomorrowStr, '10:30', '10:50', 200.0, 'CONFIRMED', 'WHATSAPP_AI', 'Beard grooming');

  // Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, business_id, user_id, title, body, type, is_read, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertNotif.run('notif_01', businessId, adminUserId, 'New WhatsApp Booking', 'Rohan Mehta booked Hair Cut & Styling for today at 11:00 AM', 'NEW_BOOKING', 0, JSON.stringify({ booking_id: 'BK1024' }));
  insertNotif.run('notif_02', businessId, adminUserId, 'WhatsApp Connected', 'WhatsApp Business Cloud API is active and receiving webhooks.', 'SYSTEM', 1, null);
}
