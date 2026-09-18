"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../db/database.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const slotEngine_js_1 = require("../engine/slotEngine.js");
const router = (0, express_1.Router)();
// GET /api/calendar/events
router.get('/events', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { start_date, end_date, staff_id } = req.query;
    let query = `
    SELECT a.*, c.name as customer_name, c.whatsapp_number as customer_phone,
           s.name as service_name, s.duration_minutes as service_duration,
           st.name as staff_name, b.currency
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    JOIN services s ON a.service_id = s.id
    JOIN staff st ON a.staff_id = st.id
    JOIN businesses b ON a.business_id = b.id
    WHERE a.business_id = ?
  `;
    const params = [businessId];
    if (start_date && end_date) {
        query += ' AND a.date BETWEEN ? AND ?';
        params.push(start_date, end_date);
    }
    else if (start_date) {
        query += ' AND a.date = ?';
        params.push(start_date);
    }
    if (staff_id && staff_id !== 'ALL') {
        query += ' AND a.staff_id = ?';
        params.push(staff_id);
    }
    query += ' ORDER BY a.date ASC, a.start_time ASC';
    const events = database_js_1.db.prepare(query).all(...params);
    const formatted = events.map((ev) => ({
        ...ev,
        formatted_start_time: (0, slotEngine_js_1.formatTime12h)(ev.start_time),
        formatted_end_time: (0, slotEngine_js_1.formatTime12h)(ev.end_time)
    }));
    res.json({ success: true, events: formatted });
});
exports.default = router;
