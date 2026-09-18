"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
// GET /api/analytics
router.get('/', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { range = '30d' } = req.query; // 'today', '7d', '30d', 'all'
    // Status breakdown
    const statusCounts = database_js_1.db.prepare(`
    SELECT status, COUNT(*) as count, COALESCE(SUM(price), 0) as revenue
    FROM appointments
    WHERE business_id = ?
    GROUP BY status
  `).all(businessId);
    // Source breakdown (WhatsApp AI vs Manual vs Admin)
    const sourceCounts = database_js_1.db.prepare(`
    SELECT source, COUNT(*) as count
    FROM appointments
    WHERE business_id = ?
    GROUP BY source
  `).all(businessId);
    // Top popular services
    const popularServices = database_js_1.db.prepare(`
    SELECT s.name, COUNT(a.id) as booking_count, COALESCE(SUM(a.price), 0) as revenue
    FROM services s
    LEFT JOIN appointments a ON s.id = a.service_id AND a.business_id = ?
    WHERE s.business_id = ?
    GROUP BY s.id
    ORDER BY booking_count DESC
    LIMIT 5
  `).all(businessId, businessId);
    // Customer acquisition (New vs Returning)
    const newCustomersRow = database_js_1.db.prepare('SELECT COUNT(*) as count FROM customers WHERE business_id = ? AND total_bookings = 1').get(businessId);
    const returningCustomersRow = database_js_1.db.prepare('SELECT COUNT(*) as count FROM customers WHERE business_id = ? AND total_bookings > 1').get(businessId);
    // Peak booking hours (Hour 9 to 20)
    const peakHoursRaw = database_js_1.db.prepare(`
    SELECT substr(start_time, 1, 2) as hour, COUNT(*) as count
    FROM appointments
    WHERE business_id = ?
    GROUP BY hour
    ORDER BY hour ASC
  `).all(businessId);
    const peakHours = peakHoursRaw.map((p) => ({
        hour: `${p.hour}:00`,
        bookings: p.count
    }));
    // Daily revenue / bookings trend (last 7 data points)
    const dailyTrends = database_js_1.db.prepare(`
    SELECT date, COUNT(*) as bookings, COALESCE(SUM(price), 0) as revenue
    FROM appointments
    WHERE business_id = ?
    GROUP BY date
    ORDER BY date DESC
    LIMIT 7
  `).all(businessId);
    res.json({
        success: true,
        range,
        summary: {
            total_bookings: statusCounts.reduce((acc, curr) => acc + curr.count, 0),
            total_revenue: statusCounts.filter((s) => ['CONFIRMED', 'COMPLETED'].includes(s.status)).reduce((acc, curr) => acc + curr.revenue, 0),
            new_customers: newCustomersRow?.count || 0,
            returning_customers: returningCustomersRow?.count || 0
        },
        status_distribution: statusCounts,
        source_distribution: sourceCounts,
        popular_services: popularServices,
        peak_hours: peakHours,
        daily_trends: dailyTrends.reverse()
    });
});
exports.default = router;
