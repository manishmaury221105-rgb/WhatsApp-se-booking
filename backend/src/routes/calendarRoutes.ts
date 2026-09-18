import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { formatTime12h } from '../engine/slotEngine.js';

const router = Router();

// GET /api/calendar/events
router.get('/events', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { start_date, end_date, staff_id } = req.query;

  let query = `
    SELECT a.*, c.name as customer_name, c.whatsapp_number as customer_phone,
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

  if (start_date && end_date) {
    query += ' AND a.date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ' AND a.date = ?';
    params.push(start_date);
  }

  if (staff_id && staff_id !== 'ALL') {
    query += ' AND a.staff_id = ?';
    params.push(staff_id);
  }

  query += ' ORDER BY a.date ASC, a.start_time ASC';

  const events = db.prepare(query).all(...params) as any[];

  const formatted = events.map((ev) => ({
    ...ev,
    formatted_start_time: formatTime12h(ev.start_time),
    formatted_end_time: formatTime12h(ev.end_time)
  }));

  res.json({ success: true, events: formatted });
});

export default router;
