import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { SlotEngine, formatTime12h } from '../engine/slotEngine.js';
import { WhatsAppService } from '../services/whatsappService.js';
import { Appointment } from '../types/index.js';

const router = Router();

// GET /api/bookings
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { status, date, source, search, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT a.*, c.name as customer_name, c.whatsapp_number as customer_phone, c.email as customer_email,
           s.name as service_name, s.duration_minutes as service_duration,
           st.name as staff_name, b.currency
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    JOIN services s ON a.service_id = s.id
    JOIN staff st ON a.staff_id = st.id
    JOIN businesses b ON a.business_id = b.id
    WHERE a.business_id = ?
  `;
  const params: any[] = [businessId];

  if (status && status !== 'ALL') {
    query += ' AND a.status = ?';
    params.push(status);
  }

  if (date) {
    query += ' AND a.date = ?';
    params.push(date);
  }

  if (source) {
    query += ' AND a.source = ?';
    params.push(source);
  }

  if (search) {
    query += ` AND (c.name LIKE ? OR c.whatsapp_number LIKE ? OR a.booking_id LIKE ? OR s.name LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY a.date DESC, a.start_time DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const items = db.prepare(query).all(...params) as any[];

  const formatted = items.map((item) => ({
    ...item,
    formatted_start_time: formatTime12h(item.start_time),
    formatted_end_time: formatTime12h(item.end_time)
  }));

  res.json({ success: true, bookings: formatted });
});

// GET /api/bookings/:id
router.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);

  const appt = db.prepare(`
    SELECT a.*, c.name as customer_name, c.whatsapp_number as customer_phone, c.email as customer_email,
           s.name as service_name, s.duration_minutes as service_duration, s.description as service_description,
           st.name as staff_name, st.phone as staff_phone, b.currency, b.name as business_name
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    JOIN services s ON a.service_id = s.id
    JOIN staff st ON a.staff_id = st.id
    JOIN businesses b ON a.business_id = b.id
    WHERE (a.id = ? OR a.booking_id = ?) AND a.business_id = ?
  `).get(id, id, businessId) as any;

  if (!appt) {
    res.status(404).json({ success: false, error: 'Booking not found' });
    return;
  }

  res.json({
    success: true,
    booking: {
      ...appt,
      formatted_start_time: formatTime12h(appt.start_time),
      formatted_end_time: formatTime12h(appt.end_time)
    }
  });
});

// POST /api/bookings
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { customer_name, customer_phone, customer_email, service_id, staff_id, date, start_time, source = 'MANUAL', notes } = req.body;

  if (!customer_name || !customer_phone || !service_id || !date || !start_time) {
    res.status(400).json({ success: false, error: 'Missing required booking parameters' });
    return;
  }

  try {
    const newBooking = SlotEngine.createBookingTransaction({
      business_id: businessId,
      customer_name,
      customer_phone,
      customer_email,
      service_id,
      staff_id,
      date,
      start_time,
      source: source || 'MANUAL',
      notes
    });

    // Dispatch WhatsApp confirmation template automatically
    const biz = db.prepare('SELECT name, currency FROM businesses WHERE id = ?').get(businessId) as any;
    await WhatsAppService.sendAutomatedTemplate(businessId, customer_phone, 'BOOKING_CONFIRMATION', {
      booking_id: newBooking.booking_id,
      customer_name,
      service_name: newBooking.service_name || '',
      date: newBooking.date,
      time: formatTime12h(newBooking.start_time),
      staff_name: newBooking.staff_name || '',
      price: `${biz?.currency || '₹'}${newBooking.price}`,
      business_name: biz?.name || 'Luxe Studio'
    });

    res.status(201).json({
      success: true,
      booking: {
        ...newBooking,
        formatted_start_time: formatTime12h(newBooking.start_time),
        formatted_end_time: formatTime12h(newBooking.end_time)
      }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/bookings/:id/confirm
router.post('/:id/confirm', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);

  db.prepare(`
    UPDATE appointments
    SET status = 'CONFIRMED', updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).run(id, businessId);

  res.json({ success: true, message: 'Booking confirmed successfully' });
});

// POST /api/bookings/:id/reschedule
router.post('/:id/reschedule', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);
  const { new_date, new_start_time, new_staff_id } = req.body;

  if (!new_date || !new_start_time) {
    res.status(400).json({ success: false, error: 'New date and new start time are required' });
    return;
  }

  try {
    const updated = SlotEngine.rescheduleAppointmentTransaction({
      business_id: businessId,
      appointment_id: id,
      new_date,
      new_start_time,
      new_staff_id
    });

    const biz = db.prepare('SELECT name, currency FROM businesses WHERE id = ?').get(businessId) as any;
    if (updated.customer_phone) {
      await WhatsAppService.sendAutomatedTemplate(businessId, updated.customer_phone, 'RESCHEDULE', {
        booking_id: updated.booking_id,
        date: updated.date,
        time: formatTime12h(updated.start_time),
        service_name: updated.service_name || '',
        staff_name: updated.staff_name || '',
        business_name: biz?.name || 'Luxe Studio'
      });
    }

    res.json({
      success: true,
      booking: {
        ...updated,
        formatted_start_time: formatTime12h(updated.start_time),
        formatted_end_time: formatTime12h(updated.end_time)
      }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);
  const { reason } = req.body;

  try {
    const cancelled = SlotEngine.cancelAppointmentTransaction({
      business_id: businessId,
      appointment_id: id,
      reason
    });

    if (cancelled.customer_phone) {
      await WhatsAppService.sendAutomatedTemplate(businessId, cancelled.customer_phone, 'CANCELLATION', {
        booking_id: cancelled.booking_id,
        service_name: cancelled.service_name || '',
        date: cancelled.date
      });
    }

    res.json({ success: true, booking: cancelled });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/bookings/:id/complete
router.post('/:id/complete', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND business_id = ?').get(id, businessId) as Appointment | undefined;
  if (!appt) {
    res.status(404).json({ success: false, error: 'Booking not found' });
    return;
  }

  db.prepare(`
    UPDATE appointments
    SET status = 'COMPLETED', updated_at = datetime('now')
    WHERE id = ?
  `).run(id);

  // Update customer completed count
  db.prepare('UPDATE customers SET completed_bookings = completed_bookings + 1 WHERE id = ?').run(appt.customer_id);

  // Trigger post-appointment feedback template
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(appt.customer_id) as any;
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(appt.service_id) as any;
  const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId) as any;

  if (customer) {
    await WhatsAppService.sendAutomatedTemplate(businessId, customer.whatsapp_number, 'FEEDBACK', {
      customer_name: customer.name,
      service_name: service?.name || '',
      business_name: biz?.name || ''
    });
  }

  res.json({ success: true, message: 'Appointment marked as COMPLETED and feedback follow-up dispatched.' });
});

// POST /api/bookings/:id/no-show
router.post('/:id/no-show', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);
  const { reason } = req.body;
  const markedBy = req.user?.name || 'Staff';

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND business_id = ?').get(id, businessId) as Appointment | undefined;
  if (!appt) {
    res.status(404).json({ success: false, error: 'Booking not found' });
    return;
  }

  db.prepare(`
    UPDATE appointments
    SET status = 'NO_SHOW',
        noshow_reason = ?,
        noshow_time = datetime('now'),
        noshow_marked_by = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(reason || 'Customer did not show up', markedBy, id);

  db.prepare('UPDATE customers SET noshow_bookings = noshow_bookings + 1 WHERE id = ?').run(appt.customer_id);

  res.json({ success: true, message: 'Appointment marked as NO_SHOW.' });
});

export default router;
