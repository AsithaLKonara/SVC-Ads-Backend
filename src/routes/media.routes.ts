import { Router } from 'express';
import { serveMedia } from '../controllers/upload.controller';

const router = Router();

router.get('/:folder/:filename', serveMedia);

export default router;

