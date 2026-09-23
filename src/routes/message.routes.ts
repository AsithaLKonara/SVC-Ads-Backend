import { Router } from 'express';
import { createMessage, getMessages, getUnreadCount, markAsRead } from '../controllers/message.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for public message submission
const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 messages per hour per IP
  message: { message: 'Too many messages sent from this IP, please try again after an hour' }
});

// Public route
router.post('/', messageLimiter, createMessage);

// Protected admin routes
router.use(requireAuth);
router.use(requireRole(['ADMIN', 'STAFF']));

router.get('/', getMessages);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);

export default router;
