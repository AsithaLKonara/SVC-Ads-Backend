import { Router } from 'express';
import { getUsers, createUser, updateUserRole, deleteUser } from '../controllers/user.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Protect all user routes with auth and ADMIN role requirement
router.use(requireAuth);
router.use(requireRole(['ADMIN']));

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;
