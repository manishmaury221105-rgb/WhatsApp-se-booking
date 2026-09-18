import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';
import { formatTime12h } from '../engine/slotEngine.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const businessId = req.user?.business_id || 'biz_default_01';
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Calculate appointment counts
  const totalTodayRow = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND date = ?').get(businessId, todayStr) as any;
  const upcomingRow = db.prepare(`
    SELECT COUNT(*) as count FROM appointments
    WHERE business_id = ? AND date >= ? AND status IN ('CONFIRMED', 'PENDING', 'RESCHEDULED')
  `).get(businessId, todayStr) as any;

  const pendingRow = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND status = 'PENDING'").get(businessId) as any;
  const confirmedRow = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND status = 'CONFIRMED'").get(businessId) as any;
  const completedRow = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND status = 'COMPLETED'").get(businessId) as any;
  const cancelledRow = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND status = 'CANCELLED'").get(businessId) as any;
  const noshowRow = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND status = 'NO_SHOW'").get(businessId) as any;

  // 2. Total Customers & Revenue
  const totalCustomersRow = db.prepare('SELECT COUNT(*) as count FROM customers WHERE business_id = ?').get(businessId) as any;
  const revenueRow = db.prepare(`
    SELECT COALESCE(SUM(price), 0) as total FROM appointments
    WHERE business_id = ? AND status IN ('CONFIRMED', 'COMPLETED')
  `).get(businessId) as any;

  // 3. Upcoming Appointments List
  const upcomingList = db.prepare(`
    SELECT a.*, c.name as customer_name, c.whatsapp_number as customer_phone,
           s.name as service_name, s.duration_minutes as service_duration,
           st.name as staff_name
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    JOIN services s ON a.service_id = s.id
    JOIN staff st ON a.staff_id = st.id
    WHERE a.business_id = ? AND a.date >= ? AND a.status IN ('CONFIRMED', 'PENDING', 'RESCHEDULED')
    ORDER BY a.date ASC, a.start_time ASC
    LIMIT 8
  `).all(businessId, todayStr) as any[];

  // Format 12h times for UI
  const formattedUpcoming = upcomingList.map((item) => ({
    ...item,
    formatted_start_time: formatTime12h(item.start_time),
    formatted_end_time: formatTime12h(item.end_time)
  }));

  res.json({
    success: true,
    stats: {
      today_appointments: totalTodayRow?.count || 0,
      upcoming_appointments: upcomingRow?.count || 0,
      pending: pendingRow?.count || 0,
      confirmed: confirmedRow?.count || 0,
      completed: completedRow?.count || 0,
      cancelled: cancelledRow?.count || 0,
      no_show: noshowRow?.count || 0,
      total_customers: totalCustomersRow?.count || 0,
      total_revenue: revenueRow?.total || 0
    },
    upcoming_list: formattedUpcoming
  });
});

export default router;
