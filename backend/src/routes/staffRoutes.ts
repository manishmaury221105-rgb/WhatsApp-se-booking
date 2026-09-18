import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { Staff } from '../types/index.js';

const router = Router();

// GET /api/staff
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const staffList = db.prepare('SELECT * FROM staff WHERE business_id = ? ORDER BY created_at ASC').all(businessId) as Staff[];

  const formatted = staffList.map((st) => {
    const services = db.prepare(`
      SELECT s.id, s.name, s.duration_minutes, s.price FROM services s
      JOIN staff_services ss ON s.id = ss.service_id
      WHERE ss.staff_id = ?
    `).all(st.id) as any[];

    let workingDaysParsed: number[] = [1, 2, 3, 4, 5, 6];
    try {
      workingDaysParsed = JSON.parse(st.working_days);
    } catch (e) {}

    return {
      ...st,
      working_days_list: workingDaysParsed,
      assigned_services: services,
      assigned_service_ids: services.map((s) => s.id)
    };
  });

  res.json({ success: true, staff: formatted });
});

// POST /api/staff
router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const {
    name,
    phone,
    email,
    profile_photo,
    working_days = '[1,2,3,4,5,6]',
    working_hours_start = '10:00',
    working_hours_end = '19:00',
    break_start = '13:00',
    break_end = '14:00',
    is_active = 1,
    assigned_service_ids = []
  } = req.body;

  if (!name) {
    res.status(400).json({ success: false, error: 'Staff name is required' });
    return;
  }

  const staffId = `staff_${uuidv4().substring(0, 8)}`;
  const daysString = typeof working_days === 'string' ? working_days : JSON.stringify(working_days);

  const insertTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO staff (
        id, business_id, name, phone, email, profile_photo,
        working_days, working_hours_start, working_hours_end, break_start, break_end, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      staffId,
      businessId,
      name,
      phone || null,
      email || null,
      profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      daysString,
      working_hours_start,
      working_hours_end,
      break_start || null,
      break_end || null,
      is_active ? 1 : 0
    );

    const insertServiceLink = db.prepare('INSERT INTO staff_services (id, staff_id, service_id) VALUES (?, ?, ?)');
    for (const serviceId of assigned_service_ids) {
      insertServiceLink.run(`ss_${uuidv4().substring(0, 8)}`, staffId, serviceId);
    }
  });

  insertTx();

  const created = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  res.status(201).json({ success: true, staff: created });
});

// PUT /api/staff/:id
router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);
  const {
    name,
    phone,
    email,
    profile_photo,
    working_days,
    working_hours_start,
    working_hours_end,
    break_start,
    break_end,
    is_active,
    assigned_service_ids
  } = req.body;

  const daysString = working_days ? (typeof working_days === 'string' ? working_days : JSON.stringify(working_days)) : null;

  const updateTx = db.transaction(() => {
    db.prepare(`
      UPDATE staff
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          profile_photo = COALESCE(?, profile_photo),
          working_days = COALESCE(?, working_days),
          working_hours_start = COALESCE(?, working_hours_start),
          working_hours_end = COALESCE(?, working_hours_end),
          break_start = COALESCE(?, break_start),
          break_end = COALESCE(?, break_end),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now')
      WHERE id = ? AND business_id = ?
    `).run(
      name,
      phone,
      email,
      profile_photo,
      daysString,
      working_hours_start,
      working_hours_end,
      break_start,
      break_end,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id,
      businessId
    );

    if (Array.isArray(assigned_service_ids)) {
      db.prepare('DELETE FROM staff_services WHERE staff_id = ?').run(id);
      const insertServiceLink = db.prepare('INSERT INTO staff_services (id, staff_id, service_id) VALUES (?, ?, ?)');
      for (const serviceId of assigned_service_ids) {
        insertServiceLink.run(`ss_${uuidv4().substring(0, 8)}`, id, serviceId);
      }
    }
  });

  updateTx();

  const updated = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  res.json({ success: true, staff: updated });
});

// PATCH /api/staff/:id/toggle
router.patch('/:id/toggle', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);

  db.prepare(`
    UPDATE staff
    SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
        updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).run(id, businessId);

  const updated = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  res.json({ success: true, staff: updated });
});

// DELETE /api/staff/:id
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);

  db.prepare('DELETE FROM staff WHERE id = ? AND business_id = ?').run(id, businessId);
  res.json({ success: true, message: 'Staff deleted successfully' });
});

export default router;
