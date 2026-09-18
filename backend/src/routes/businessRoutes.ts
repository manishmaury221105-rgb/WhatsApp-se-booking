import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { Business } from '../types/index.js';

const router = Router();

// GET /api/business/profile
router.get('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId) as Business | undefined;

  if (!business) {
    res.status(404).json({ success: false, error: 'Business profile not found' });
    return;
  }

  res.json({ success: true, business });
});

// PUT /api/business/profile
router.put('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const {
    name,
    logo_url,
    phone,
    whatsapp_number,
    email,
    address,
    timezone,
    currency,
    description
  } = req.body;

  db.prepare(`
    UPDATE businesses
    SET name = COALESCE(?, name),
        logo_url = COALESCE(?, logo_url),
        phone = COALESCE(?, phone),
        whatsapp_number = COALESCE(?, whatsapp_number),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        timezone = COALESCE(?, timezone),
        currency = COALESCE(?, currency),
        description = COALESCE(?, description),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name,
    logo_url,
    phone,
    whatsapp_number,
    email,
    address,
    timezone,
    currency,
    description,
    businessId
  );

  const updated = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
  res.json({ success: true, business: updated });
});

export default router;
