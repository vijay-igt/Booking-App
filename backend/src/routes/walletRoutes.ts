import { Router } from 'express';
import { authenticateToken, adminAuth } from '../middleware/auth';
import {
    getBalance,
    requestTopUp,
    getPendingRequests,
    approveRequest,
    rejectRequest,
    getUsersWithBalance,
    directTopUp
} from '../controllers/walletController';

const router = Router();

// User Routes
router.get('/balance', authenticateToken, getBalance);
router.post('/topup', authenticateToken, requestTopUp);

// Admin Routes
router.get('/admin/requests', authenticateToken, adminAuth, getPendingRequests);
router.post('/admin/approve/:requestId', authenticateToken, adminAuth, approveRequest);
router.post('/admin/reject/:requestId', authenticateToken, adminAuth, rejectRequest);
router.get('/admin/users', authenticateToken, adminAuth, getUsersWithBalance);
router.post('/admin/direct-topup', authenticateToken, adminAuth, directTopUp);

export default router;
