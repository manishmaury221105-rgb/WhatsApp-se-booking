"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const slotEngine_js_1 = require("../engine/slotEngine.js");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// GET /api/customers
router.get('/', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { search } = req.query;
    let query = 'SELECT * FROM customers WHERE business_id = ?';
    const params = [businessId];
    if (search) {
        query += ' AND (name LIKE ? OR whatsapp_number LIKE ? OR email LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
    }
    query += ' ORDER BY created_at DESC';
    const customers = database_js_1.db.prepare(query).all(...params);
    res.json({ success: true, customers });
});
// GET /api/customers/:id
router.get('/:id', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const id = String(req.params.id);
    const customer = database_js_1.db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(id, businessId);
    if (!customer) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
    }
    // Fetch appointment history
    const history = database_js_1.db.prepare(`
    SELECT a.*, s.name as service_name, st.name as staff_name, b.currency
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN staff st ON a.staff_id = st.id
    JOIN businesses b ON a.business_id = b.id
    WHERE a.customer_id = ? AND a.business_id = ?
    ORDER BY a.date DESC, a.start_time DESC
  `).all(id, businessId);
    const formattedHistory = history.map((item) => ({
        ...item,
        formatted_start_time: (0, slotEngine_js_1.formatTime12h)(item.start_time),
        formatted_end_time: (0, slotEngine_js_1.formatTime12h)(item.end_time)
    }));
    const todayStr = new Date().toISOString().split('T')[0];
    const lastAppt = history.find((a) => a.date < todayStr || a.status === 'COMPLETED');
    const nextAppt = history.slice().reverse().find((a) => a.date >= todayStr && (a.status === 'CONFIRMED' || a.status === 'RESCHEDULED'));
    res.json({
        success: true,
        customer,
        last_appointment: lastAppt || null,
        next_appointment: nextAppt || null,
        history: formattedHistory
    });
});
// POST /api/customers
router.post('/', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { name, whatsapp_number, email, notes } = req.body;
    if (!name || !whatsapp_number) {
        res.status(400).json({ success: false, error: 'Name and WhatsApp Number are required' });
        return;
    }
    const existing = database_js_1.db.prepare('SELECT * FROM customers WHERE business_id = ? AND whatsapp_number = ?').get(businessId, whatsapp_number);
    if (existing) {
        res.status(400).json({ success: false, error: 'Customer with this WhatsApp number already exists.' });
        return;
    }
    const customerId = `cust_${(0, uuid_1.v4)().substring(0, 8)}`;
    database_js_1.db.prepare(`
    INSERT INTO customers (id, business_id, name, whatsapp_number, email, total_bookings, completed_bookings, cancelled_bookings, noshow_bookings, notes)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?)
  `).run(customerId, businessId, name, whatsapp_number, email || null, notes || '');
    const created = database_js_1.db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    res.status(201).json({ success: true, customer: created });
});
// PUT /api/customers/:id
router.put('/:id', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const id = String(req.params.id);
    const { name, whatsapp_number, email, notes } = req.body;
    database_js_1.db.prepare(`
    UPDATE customers
    SET name = COALESCE(?, name),
        whatsapp_number = COALESCE(?, whatsapp_number),
        email = COALESCE(?, email),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).run(name, whatsapp_number, email, notes, id, businessId);
    const updated = database_js_1.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json({ success: true, customer: updated });
});
exports.default = router;
