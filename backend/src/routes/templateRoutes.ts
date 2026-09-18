import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { MessageTemplate } from '../types/index.js';
import { WhatsAppService } from '../services/whatsappService.js';

const router = Router();

// GET /api/templates
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const templates = db.prepare('SELECT * FROM message_templates WHERE business_id = ? ORDER BY created_at ASC').all(businessId) as MessageTemplate[];

  const formatted = templates.map((t) => {
    let vars: string[] = [];
    try {
      vars = JSON.parse(t.variables);
    } catch (e) {}
    return {
      ...t,
      variables_list: vars
    };
  });

  res.json({ success: true, templates: formatted });
});

// PUT /api/templates/:id
router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { id } = req.params;
  const { name, content, variables, is_active } = req.body;

  const varsJson = variables ? (typeof variables === 'string' ? variables : JSON.stringify(variables)) : null;

  db.prepare(`
    UPDATE message_templates
    SET name = COALESCE(?, name),
        content = COALESCE(?, content),
        variables = COALESCE(?, variables),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
    WHERE id = ? AND business_id = ?
  `).run(name, content, varsJson, is_active !== undefined ? (is_active ? 1 : 0) : null, id, businessId);

  const updated = db.prepare('SELECT * FROM message_templates WHERE id = ?').get(id) as MessageTemplate;
  res.json({ success: true, template: updated });
});

// POST /api/templates/preview
router.post('/preview', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { content, sample_data = {} } = req.body;

  const defaultSamples = {
    customer_name: 'Rahul Verma',
    service_name: 'Hair Cut & Styling',
    staff_name: 'Rahul Sharma',
    booking_id: 'BK1024',
    date: '2026-09-20',
    time: '4:00 PM',
    price: '₹350',
    business_name: 'Luxe Salon & Spa'
  };

  const merged = { ...defaultSamples, ...sample_data };
  const preview = WhatsAppService.renderTemplate(content || '', merged);

  res.json({ success: true, preview });
});

export default router;
