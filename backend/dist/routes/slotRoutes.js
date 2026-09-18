"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const slotEngine_js_1 = require("../engine/slotEngine.js");
const router = (0, express_1.Router)();
// GET /api/slots/available
router.get('/available', authMiddleware_js_1.authenticateToken, (req, res) => {
    const businessId = req.user?.business_id || 'biz_default_01';
    const { date, service_id, staff_id } = req.query;
    if (!date || !service_id) {
        res.status(400).json({ success: false, error: 'date (YYYY-MM-DD) and service_id are required' });
        return;
    }
    const slots = slotEngine_js_1.SlotEngine.calculateAvailableSlots({
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
exports.default = router;
