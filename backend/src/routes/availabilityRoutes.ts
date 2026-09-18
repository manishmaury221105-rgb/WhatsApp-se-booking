import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { BusinessHours, BlockedSlot, Holiday, StaffLeave } from '../types/index.js';
import { formatTime12h } from '../engine/slotEngine.js';

const router = Router();

// GET /api/availability/hours
router.get('/hours', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const hours = db.prepare('SELECT * FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC').all(businessId) as BusinessHours[];
  res.json({ success: true, hours });
});

// PUT /api/availability/hours
router.put('/hours', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { hours } = req.body; // Array of { day_of_week, is_open, open_time, close_time, break_start, break_end }

  if (!Array.isArray(hours)) {
    res.status(400).json({ success: false, error: 'Array of hours required' });
    return;
  }

  const updateTx = db.transaction(() => {
    const updateStmt = db.prepare(`
      INSERT INTO business_hours (id, business_id, day_of_week, is_open, open_time, close_time, break_start, break_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(business_id, day_of_week) DO UPDATE SET
        is_open = excluded.is_open,
        open_time = excluded.open_time,
        close_time = excluded.close_time,
        break_start = excluded.break_start,
        break_end = excluded.break_end
    `);

    for (const item of hours) {
      updateStmt.run(
        `bh_${item.day_of_week}`,
        businessId,
        item.day_of_week,
        item.is_open ? 1 : 0,
        item.open_time || '09:00',
        item.close_time || '20:00',
        item.break_start || null,
        item.break_end || null
      );
    }
  });

  updateTx();

  const updated = db.prepare('SELECT * FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC').all(businessId);
  res.json({ success: true, hours: updated });
});

// GET /api/availability/holidays
router.get('/holidays', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const holidays = db.prepare('SELECT * FROM holidays WHERE business_id = ? ORDER BY date ASC').all(businessId) as Holiday[];
  res.json({ success: true, holidays });
});

// POST /api/availability/holidays
router.post('/holidays', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { date, name } = req.body;

  if (!date || !name) {
    res.status(400).json({ success: false, error: 'Date and holiday name are required' });
    return;
  }

  const holidayId = `hol_${uuidv4().substring(0, 8)}`;
  db.prepare(`
    INSERT INTO holidays (id, business_id, date, name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(business_id, date) DO UPDATE SET name = excluded.name
  `).run(holidayId, businessId, date, name);

  const created = db.prepare('SELECT * FROM holidays WHERE id = ?').get(holidayId);
  res.status(201).json({ success: true, holiday: created });
});

// DELETE /api/availability/holidays/:id
router.delete('/holidays/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { id } = req.params;

  db.prepare('DELETE FROM holidays WHERE id = ? AND business_id = ?').run(id, businessId);
  res.json({ success: true, message: 'Holiday deleted' });
});

// GET /api/availability/blocked-slots
router.get('/blocked-slots', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const slots = db.prepare(`
    SELECT b.*, s.name as staff_name
    FROM blocked_slots b
    LEFT JOIN staff s ON b.staff_id = s.id
    WHERE b.business_id = ?
    ORDER BY b.date DESC, b.start_time ASC
  `).all(businessId) as any[];

  const formatted = slots.map((s) => ({
    ...s,
    formatted_start_time: formatTime12h(s.start_time),
    formatted_end_time: formatTime12h(s.end_time)
  }));

  res.json({ success: true, blocked_slots: formatted });
});

// POST /api/availability/blocked-slots
router.post('/blocked-slots', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { staff_id, date, start_time, end_time, reason } = req.body;

  if (!date || !start_time || !end_time) {
    res.status(400).json({ success: false, error: 'Date, start_time, and end_time are required' });
    return;
  }

  const blockId = `block_${uuidv4().substring(0, 8)}`;
  db.prepare(`
    INSERT INTO blocked_slots (id, business_id, staff_id, date, start_time, end_time, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(blockId, businessId, staff_id || null, date, start_time, end_time, reason || 'Manual Block');

  const created = db.prepare('SELECT * FROM blocked_slots WHERE id = ?').get(blockId);
  res.status(201).json({ success: true, blocked_slot: created });
});

// DELETE /api/availability/blocked-slots/:id
router.delete('/blocked-slots/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { id } = req.params;

  db.prepare('DELETE FROM blocked_slots WHERE id = ? AND business_id = ?').run(id, businessId);
  res.json({ success: true, message: 'Blocked slot removed' });
});

export default router;
