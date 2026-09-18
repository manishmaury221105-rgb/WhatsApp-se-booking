"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const database_js_1 = require("./db/database.js");
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const dashboardRoutes_js_1 = __importDefault(require("./routes/dashboardRoutes.js"));
const bookingRoutes_js_1 = __importDefault(require("./routes/bookingRoutes.js"));
const slotRoutes_js_1 = __importDefault(require("./routes/slotRoutes.js"));
const calendarRoutes_js_1 = __importDefault(require("./routes/calendarRoutes.js"));
const customerRoutes_js_1 = __importDefault(require("./routes/customerRoutes.js"));
const serviceRoutes_js_1 = __importDefault(require("./routes/serviceRoutes.js"));
const staffRoutes_js_1 = __importDefault(require("./routes/staffRoutes.js"));
const availabilityRoutes_js_1 = __importDefault(require("./routes/availabilityRoutes.js"));
const whatsappRoutes_js_1 = __importDefault(require("./routes/whatsappRoutes.js"));
const aiRoutes_js_1 = __importDefault(require("./routes/aiRoutes.js"));
const automationRoutes_js_1 = __importDefault(require("./routes/automationRoutes.js"));
const templateRoutes_js_1 = __importDefault(require("./routes/templateRoutes.js"));
const analyticsRoutes_js_1 = __importDefault(require("./routes/analyticsRoutes.js"));
const notificationRoutes_js_1 = __importDefault(require("./routes/notificationRoutes.js"));
const businessRoutes_js_1 = __importDefault(require("./routes/businessRoutes.js"));
// Initialize DB schema & seeds
(0, database_js_1.initDatabase)();
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
exports.app.use((0, cors_1.default)({ origin: '*' }));
exports.app.use(express_1.default.json({ limit: '10mb' }));
exports.app.use(express_1.default.urlencoded({ extended: true }));
// Health Check
exports.app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'whatsapp-booking-backend'
    });
});
// API Routes
exports.app.use('/api/auth', authRoutes_js_1.default);
exports.app.use('/api/dashboard', dashboardRoutes_js_1.default);
exports.app.use('/api/bookings', bookingRoutes_js_1.default);
exports.app.use('/api/slots', slotRoutes_js_1.default);
exports.app.use('/api/calendar', calendarRoutes_js_1.default);
exports.app.use('/api/customers', customerRoutes_js_1.default);
exports.app.use('/api/services', serviceRoutes_js_1.default);
exports.app.use('/api/staff', staffRoutes_js_1.default);
exports.app.use('/api/availability', availabilityRoutes_js_1.default);
exports.app.use('/api/whatsapp', whatsappRoutes_js_1.default);
exports.app.use('/api/ai', aiRoutes_js_1.default);
exports.app.use('/api/automations', automationRoutes_js_1.default);
exports.app.use('/api/templates', templateRoutes_js_1.default);
exports.app.use('/api/analytics', analyticsRoutes_js_1.default);
exports.app.use('/api/notifications', notificationRoutes_js_1.default);
exports.app.use('/api/business', businessRoutes_js_1.default);
// Global Error Handler
exports.app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error'
    });
});
