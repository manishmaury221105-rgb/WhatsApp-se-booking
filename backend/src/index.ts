import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { AutomationWorker } from './services/automationWorker.js';

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 WhatsApp Booking Backend API running on port ${PORT}`);
  console.log(`🌐 Health Check: http://localhost:${PORT}/health`);
  console.log(`📱 WhatsApp Webhook: http://localhost:${PORT}/api/whatsapp/webhook`);
  console.log(`=======================================================`);

  // Start automation & reminder worker
  AutomationWorker.start();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  AutomationWorker.stop();
  server.close(() => {
    console.log('HTTP server closed');
  });
});
