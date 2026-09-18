import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { Service } from '../types/index.js';

const router = Router();

// GET /api/services
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const services = db.prepare('SELECT * FROM services WHERE business_id = ? ORDER BY created_at ASC').all(businessId) as Service[];

  // Attach assigned staff IDs
  const servicesWithStaff = services.map((srv) => {
    const assignedStaff = db.prepare(`
      SELECT s.id, s.name FROM staff s
      JOIN staff_services ss ON s.id = ss.staff_id
      WHERE ss.service_id = ?
    `).all(srv.id) as Array<{ id: string; name: string }>;

    return {
      ...srv,
      assigned_staff_ids: assignedStaff.map((s) => s.id),
      assigned_staff: assignedStaff
    };
  });

  res.json({ success: true, services: servicesWithStaff });
});

// POST /api/services
router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { name, description, duration_minutes = 30, price = 0, is_active = 1, assigned_staff_ids = [] } = req.body;

  if (!name) {
    res.status(400).json({ success: false, error: 'Service name is required' });
    return;
  }

  const serviceId = `srv_${uuidv4().substring(0, 8)}`;

  const insertTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO services (id, business_id, name, description, duration_minutes, price, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(serviceId, businessId, name, description || '', Number(duration_minutes), Number(price), is_active ? 1 : 0);

    const insertStaffLink = db.prepare('INSERT INTO staff_services (id, staff_id, service_id) VALUES (?, ?, ?)');
    for (const staffId of assigned_staff_ids) {
      insertStaffLink.run(`ss_${uuidv4().substring(0, 8)}`, staffId, serviceId);
    }
  });

  insertTx();

  const created = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
  res.status(201).json({ success: true, service: created });
});

// PUT /api/services/:id
router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);
  const { name, description, duration_minutes, price, is_active, assigned_staff_ids } = req.body;

  const updateTx = db.transaction(() => {
    db.prepare(`
      UPDATE services
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          duration_minutes = COALESCE(?, duration_minutes),
          price = COALESCE(?, price),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now')
      WHERE id = ? AND business_id = ?
    `).run(name, description, duration_minutes, price, is_active !== undefined ? (is_active ? 1 : 0) : null, id, businessId);

    if (Array.isArray(assigned_staff_ids)) {
      db.prepare('DELETE FROM staff_services WHERE service_id = ?').run(id);
      const insertStaffLink = db.prepare('INSERT INTO staff_services (id, staff_id, service_id) VALUES (?, ?, ?)');
      for (const staffId of assigned_staff_ids) {
        insertStaffLink.run(`ss_${uuidv4().substring(0, 8)}`, staffId, id);
      }
    }
  });

  updateTx();

  const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  res.json({ success: true, service: updated });
});

// PATCH /api/services/:id/toggle
router.patch('/:id/toggle', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);

  db.prepare(`
    UPDATE services
    SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
        updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).run(id, businessId);

  const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  res.json({ success: true, service: updated });
});

// DELETE /api/services/:id
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const id = String(req.params.id);

  db.prepare('DELETE FROM services WHERE id = ? AND business_id = ?').run(id, businessId);
  res.json({ success: true, message: 'Service deleted successfully' });
});

export default router;
