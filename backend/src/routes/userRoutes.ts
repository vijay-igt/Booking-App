import { Router } from 'express';
import { requestOwnerStatus } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/request-owner', authenticateToken, requestOwnerStatus);

export default router;
