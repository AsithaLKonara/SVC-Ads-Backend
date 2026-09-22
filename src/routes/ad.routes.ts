import { Router } from 'express';
import { createAd, getAds, getAdByIdOrSlug, updateAd, deleteAd, toggleAdStatus } from '../controllers/ad.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/', getAds);
router.get('/:identifier', getAdByIdOrSlug);

// Protected routes
router.post('/', requireAuth, requireRole(['ADMIN', 'STAFF']), createAd);
router.patch('/:id', requireAuth, requireRole(['ADMIN', 'STAFF']), updateAd);
router.patch('/:id/status', requireAuth, requireRole(['ADMIN', 'STAFF']), toggleAdStatus);
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'STAFF']), deleteAd);

export default router;
