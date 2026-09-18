import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { NotificationItem } from '../types/index.js';

const router = Router();

// GET /api/notifications
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE business_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(businessId) as NotificationItem[];

  const unreadCountRow = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE business_id = ? AND is_read = 0').get(businessId) as any;

  res.json({
    success: true,
    unread_count: unreadCountRow?.count || 0,
    notifications
  });
});

// POST /api/notifications/:id/read
router.post('/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const { id } = req.params;

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND business_id = ?').run(id, businessId);
  res.json({ success: true, message: 'Notification marked as read' });
});

// POST /api/notifications/read-all
router.post('/read-all', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';

  db.prepare('UPDATE notifications SET is_read = 1 WHERE business_id = ?').run(businessId);
  res.json({ success: true, message: 'All notifications marked as read' });
});

export default router;
