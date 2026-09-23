import app from './app';
import 'dotenv/config';
import { scheduleAuditLogPrune } from './utils/pruneAuditLogs';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Schedule 90-day audit log auto-prune
  scheduleAuditLogPrune();
});
