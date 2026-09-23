import http from 'http';
import app from './app';
import 'dotenv/config';
import { scheduleAuditLogPrune } from './utils/pruneAuditLogs';
import { initSocket } from './socket';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Schedule 90-day audit log auto-prune
  scheduleAuditLogPrune();
});
