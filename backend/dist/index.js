"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_js_1 = require("./app.js");
const automationWorker_js_1 = require("./services/automationWorker.js");
const PORT = process.env.PORT || 4000;
const server = app_js_1.app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 WhatsApp Booking Backend API running on port ${PORT}`);
    console.log(`🌐 Health Check: http://localhost:${PORT}/health`);
    console.log(`📱 WhatsApp Webhook: http://localhost:${PORT}/api/whatsapp/webhook`);
    console.log(`=======================================================`);
    // Start automation & reminder worker
    automationWorker_js_1.AutomationWorker.start();
});
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    automationWorker_js_1.AutomationWorker.stop();
    server.close(() => {
        console.log('HTTP server closed');
    });
});
