"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const slotEngine_js_1 = require("../engine/slotEngine.js");
const router = (0, express_1.Router)();
// GET /api/dashboard/stats
router.get('/stats', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const todayStr = new Date().toISOString().split('T')[0];
    // 1. Calculate appointment counts
    const totalTodayRow = database_js_1.db.prepare('SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND date = ?').get(businessId, todayStr);
    const upcomingRow = database_js_1.db.prepare(`
    SELECT COUNT(*) as count FROM appointments
    WHERE business_id = ? AND date >= ? AND status IN ('CONFIRMED', 'PENDING', 'RESCHEDULED')
  `).get(businessId, todayStr);
    const pendingRow = database_js_1.db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND status = 'PENDING'").get(businessId);
    const confirmedRow = database_js_1.db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND status = 'CONFIRMED'").get(businessId);
    const completedRow = database_js_1.db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND status = 'COMPLETED'").get(businessId);
    const cancelledRow = database_js_1.db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND status = 'CANCELLED'").get(businessId);
    const noshowRow = database_js_1.db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND status = 'NO_SHOW'").get(businessId);
    // 2. Total Customers & Revenue
    const totalCustomersRow = database_js_1.db.prepare('SELECT COUNT(*) as count FROM customers WHERE business_id = ?').get(businessId);
    const revenueRow = database_js_1.db.prepare(`
    SELECT COALESCE(SUM(price), 0) as total FROM appointments
    WHERE business_id = ? AND status IN ('CONFIRMED', 'COMPLETED')
  `).get(businessId);
    // 3. Upcoming Appointments List
    const upcomingList = database_js_1.db.prepare(`
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
  `).all(businessId, todayStr);
    // Format 12h times for UI
    const formattedUpcoming = upcomingList.map((item) => ({
        ...item,
        formatted_start_time: (0, slotEngine_js_1.formatTime12h)(item.start_time),
        formatted_end_time: (0, slotEngine_js_1.formatTime12h)(item.end_time)
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
exports.default = router;
