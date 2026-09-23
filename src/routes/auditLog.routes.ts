import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLog.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// GET only — audit logs are immutable, no POST/PUT/DELETE
router.get('/', requireAuth, requireRole(['ADMIN']), getAuditLogs);

export default router;
