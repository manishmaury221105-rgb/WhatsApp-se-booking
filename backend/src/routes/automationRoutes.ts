import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { AutomationRule } from '../types/index.js';
import { AutomationWorker } from '../services/automationWorker.js';

const router = Router();

// GET /api/automations
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const rules = db.prepare(`
    SELECT ar.*, mt.name as template_name, mt.content as template_content
    FROM automation_rules ar
    LEFT JOIN message_templates mt ON ar.template_id = mt.id
    WHERE ar.business_id = ?
    ORDER BY ar.created_at ASC
  `).all(businessId) as any[];

  res.json({ success: true, automations: rules });
});

// PUT /api/automations/:id
router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { id } = req.params;
  const { is_enabled, template_id, delay_minutes } = req.body;

  db.prepare(`
    UPDATE automation_rules
    SET is_enabled = COALESCE(?, is_enabled),
        template_id = COALESCE(?, template_id),
        delay_minutes = COALESCE(?, delay_minutes),
        updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).run(is_enabled !== undefined ? (is_enabled ? 1 : 0) : null, template_id, delay_minutes, id, businessId);

  const updated = db.prepare(`
    SELECT ar.*, mt.name as template_name, mt.content as template_content
    FROM automation_rules ar
    LEFT JOIN message_templates mt ON ar.template_id = mt.id
    WHERE ar.id = ?
  `).get(id);

  res.json({ success: true, automation: updated });
});

// POST /api/automations/test-worker
router.post('/test-worker', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const result = await AutomationWorker.processReminders();
  res.json({ success: true, processed: result });
});

export default router;
