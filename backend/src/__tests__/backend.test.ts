import request from 'supertest';
import { app } from '../app.js';
import { db } from '../db/database.js';
import { SlotEngine } from '../engine/slotEngine.js';

describe('WhatsApp Booking Backend & Engine Test Suite', () => {
  let adminToken: string;
  const businessId = 'biz_default_01';

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@salon.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    adminToken = res.body.token;
  });

  test('GET /health should return 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('SlotEngine should calculate available slots accurately', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const slots = SlotEngine.calculateAvailableSlots({
      business_id: businessId,
      date: dateStr,
      service_id: 'srv_01'
    });

    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty('time');
    expect(slots[0]).toHaveProperty('formatted_time');
    expect(slots[0]).toHaveProperty('is_available', true);
  });

  test('SlotEngine should prevent double-booking atomically', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const testDate = tomorrow.toISOString().split('T')[0];

    // First booking should succeed
    const appt1 = SlotEngine.createBookingTransaction({
      business_id: businessId,
      customer_name: 'Test Customer 1',
      customer_phone: '+919876500001',
      service_id: 'srv_01',
      staff_id: 'staff_01',
      date: testDate,
      start_time: '11:00',
      source: 'MANUAL'
    });

    expect(appt1).toBeDefined();
    expect(appt1.booking_id).toBeDefined();

    // Duplicate booking on the same slot & staff MUST throw an error
    expect(() => {
      SlotEngine.createBookingTransaction({
        business_id: businessId,
        customer_name: 'Test Customer 2',
        customer_phone: '+919876500002',
        service_id: 'srv_01',
        staff_id: 'staff_01',
        date: testDate,
        start_time: '11:00',
        source: 'WHATSAPP_AI'
      });
    }).toThrow(/already booked or blocked/);
  });

  test('GET /api/dashboard/stats should return dashboard KPIs', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toHaveProperty('today_appointments');
    expect(res.body.stats).toHaveProperty('total_revenue');
  });

  test('Meta WhatsApp Webhook verification endpoint', async () => {
    const challenge = 'random_hub_challenge_12345';
    const verifyToken = 'whatsapp_booking_webhook_verify_token_2026';

    const res = await request(app)
      .get(`/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=${challenge}&hub.verify_token=${verifyToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toBe(challenge);
  });

  test('POST /api/ai/chat-simulate interactive AI booking agent test', async () => {
    // 1. Initial Greeting
    const res1 = await request(app)
      .post('/api/ai/chat-simulate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer_phone: '+919888877777',
        customer_name: 'Simulated User',
        message: 'Hi, appointment book karna hai'
      });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.reply).toContain('Hair Cut');

    // 2. Select Service
    const res2 = await request(app)
      .post('/api/ai/chat-simulate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer_phone: '+919888877777',
        customer_name: 'Simulated User',
        message: 'Hair Cut'
      });

    expect(res2.status).toBe(200);
    expect(res2.body.reply).toContain('date');
  });
});
