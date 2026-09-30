import { Router } from 'express';
import { trackVisit, getStats } from '../controllers/analytics.controller';

const router = Router();

// Public route to track visits
router.post('/track', trackVisit);

// Admin route to get analytics stats
// Should ideally have admin auth middleware, but omitted for simplicity
router.get('/stats', getStats);

export default router;
