import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { Customer } from '../types/index.js';
import { formatTime12h } from '../engine/slotEngine.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/customers
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { search } = req.query;

  let query = 'SELECT * FROM customers WHERE business_id = ?';
  const params: any[] = [businessId];

  if (search) {
    query += ' AND (name LIKE ? OR whatsapp_number LIKE ? OR email LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';

  const customers = db.prepare(query).all(...params) as Customer[];
  res.json({ success: true, customers });
});

// GET /api/customers/:id
router.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(id, businessId) as Customer | undefined;
  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  // Fetch appointment history
  const history = db.prepare(`
    SELECT a.*, s.name as service_name, st.name as staff_name, b.currency
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN staff st ON a.staff_id = st.id
    JOIN businesses b ON a.business_id = b.id
    WHERE a.customer_id = ? AND a.business_id = ?
    ORDER BY a.date DESC, a.start_time DESC
  `).all(id, businessId) as any[];

  const formattedHistory = history.map((item) => ({
    ...item,
    formatted_start_time: formatTime12h(item.start_time),
    formatted_end_time: formatTime12h(item.end_time)
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
router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { name, whatsapp_number, email, notes } = req.body;

  if (!name || !whatsapp_number) {
    res.status(400).json({ success: false, error: 'Name and WhatsApp Number are required' });
    return;
  }

  const existing = db.prepare('SELECT * FROM customers WHERE business_id = ? AND whatsapp_number = ?').get(businessId, whatsapp_number) as Customer | undefined;
  if (existing) {
    res.status(400).json({ success: false, error: 'Customer with this WhatsApp number already exists.' });
    return;
  }

  const customerId = `cust_${uuidv4().substring(0, 8)}`;
  db.prepare(`
    INSERT INTO customers (id, business_id, name, whatsapp_number, email, total_bookings, completed_bookings, cancelled_bookings, noshow_bookings, notes)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?)
  `).run(customerId, businessId, name, whatsapp_number, email || null, notes || '');

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  res.status(201).json({ success: true, customer: created });
});

// PUT /api/customers/:id
router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);
  const { name, whatsapp_number, email, notes } = req.body;

  db.prepare(`
    UPDATE customers
    SET name = COALESCE(?, name),
        whatsapp_number = COALESCE(?, whatsapp_number),
        email = COALESCE(?, email),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).run(name, whatsapp_number, email, notes, id, businessId);

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.json({ success: true, customer: updated });
});

export default router;
