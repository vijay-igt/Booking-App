import { Router } from 'express';
import { register, login, updateProfile, getUserById, getMe } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.put('/profile', authenticateToken, updateProfile);
router.get('/users/:id', authenticateToken, getUserById);
router.get('/me', authenticateToken, getMe);

export default router;
