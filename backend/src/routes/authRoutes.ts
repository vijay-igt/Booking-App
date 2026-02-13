import { Router } from 'express';
import { register, login, updateProfile, getUserById, getMe, forgotPassword, resetPassword, verifyEmail, resendVerification } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.put('/profile', authenticateToken, updateProfile);
router.get('/users/:id', authenticateToken, getUserById);
router.get('/me', authenticateToken, getMe);

export default router;
