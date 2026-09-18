"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
// GET /api/services
router.get('/', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const services = database_js_1.db.prepare('SELECT * FROM services WHERE business_id = ? ORDER BY created_at ASC').all(businessId);
    // Attach assigned staff IDs
    const servicesWithStaff = services.map((srv) => {
        const assignedStaff = database_js_1.db.prepare(`
      SELECT s.id, s.name FROM staff s
      JOIN staff_services ss ON s.id = ss.staff_id
      WHERE ss.service_id = ?
    `).all(srv.id);
        return {
            ...srv,
            assigned_staff_ids: assignedStaff.map((s) => s.id),
            assigned_staff: assignedStaff
        };
    });
    res.json({ success: true, services: servicesWithStaff });
});
// POST /api/services
router.post('/', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { name, description, duration_minutes = 30, price = 0, is_active = 1, assigned_staff_ids = [] } = req.body;
    if (!name) {
        res.status(400).json({ success: false, error: 'Service name is required' });
        return;
    }
    const serviceId = `srv_${(0, uuid_1.v4)().substring(0, 8)}`;
    const insertTx = database_js_1.db.transaction(() => {
        database_js_1.db.prepare(`
      INSERT INTO services (id, business_id, name, description, duration_minutes, price, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(serviceId, businessId, name, description || '', Number(duration_minutes), Number(price), is_active ? 1 : 0);
        const insertStaffLink = database_js_1.db.prepare('INSERT INTO staff_services (id, staff_id, service_id) VALUES (?, ?, ?)');
        for (const staffId of assigned_staff_ids) {
            insertStaffLink.run(`ss_${(0, uuid_1.v4)().substring(0, 8)}`, staffId, serviceId);
        }
    });
    insertTx();
    const created = database_js_1.db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
    res.status(201).json({ success: true, service: created });
});
// PUT /api/services/:id
router.put('/:id', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const id = String(req.params.id);
    const { name, description, duration_minutes, price, is_active, assigned_staff_ids } = req.body;
    const updateTx = database_js_1.db.transaction(() => {
        database_js_1.db.prepare(`
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
            database_js_1.db.prepare('DELETE FROM staff_services WHERE service_id = ?').run(id);
            const insertStaffLink = database_js_1.db.prepare('INSERT INTO staff_services (id, staff_id, service_id) VALUES (?, ?, ?)');
            for (const staffId of assigned_staff_ids) {
                insertStaffLink.run(`ss_${(0, uuid_1.v4)().substring(0, 8)}`, staffId, id);
            }
        }
    });
    updateTx();
    const updated = database_js_1.db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    res.json({ success: true, service: updated });
});
// PATCH /api/services/:id/toggle
router.patch('/:id/toggle', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const id = String(req.params.id);
    database_js_1.db.prepare(`
    UPDATE services
    SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
        updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).run(id, businessId);
    const updated = database_js_1.db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    res.json({ success: true, service: updated });
});
// DELETE /api/services/:id
router.delete('/:id', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const id = String(req.params.id);
    database_js_1.db.prepare('DELETE FROM services WHERE id = ? AND business_id = ?').run(id, businessId);
    res.json({ success: true, message: 'Service deleted successfully' });
});
exports.default = router;
