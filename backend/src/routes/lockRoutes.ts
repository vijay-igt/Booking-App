import { Router } from 'express';
import { lockSeats, unlockSeats } from '../controllers/lockController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/lock', authenticateToken, lockSeats);
router.post('/unlock', authenticateToken, unlockSeats);

export default router;
