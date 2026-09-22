import { Router } from 'express';
import {
  getCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive
} from '../controllers/category.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public route
router.get('/', getCategories);

// Admin/Staff routes
router.get('/admin', requireAuth, requireRole(['ADMIN', 'STAFF']), getAdminCategories);
router.post('/', requireAuth, requireRole(['ADMIN', 'STAFF']), createCategory);
router.patch('/:id', requireAuth, requireRole(['ADMIN', 'STAFF']), updateCategory);
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'STAFF']), deleteCategory);
router.patch('/:id/toggle', requireAuth, requireRole(['ADMIN', 'STAFF']), toggleCategoryActive);

export default router;
