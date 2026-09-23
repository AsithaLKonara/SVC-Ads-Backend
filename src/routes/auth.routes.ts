import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimit.middleware';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Apply authLimiter to all authentication routes
router.use(authLimiter);

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.put('/change-password', requireAuth, changePassword);

export default router;
