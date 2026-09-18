import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { SlotEngine } from '../engine/slotEngine.js';

const router = Router();

// GET /api/slots/available
router.get('/available', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { date, service_id, staff_id } = req.query;

  if (!date || !service_id) {
    res.status(400).json({ success: false, error: 'date (YYYY-MM-DD) and service_id are required' });
    return;
  }

  const slots = SlotEngine.calculateAvailableSlots({
    business_id: businessId,
    date: String(date),
    service_id: String(service_id),
    staff_id: staff_id ? String(staff_id) : undefined
  });

  res.json({
    success: true,
    date,
    service_id,
    slots
  });
});

export default router;
