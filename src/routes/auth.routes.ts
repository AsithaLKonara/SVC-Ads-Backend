import { Router } from 'express';
import { register, login, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

// Apply authLimiter to all authentication routes
router.use(authLimiter);

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
