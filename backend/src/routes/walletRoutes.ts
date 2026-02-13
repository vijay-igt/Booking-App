import { Router } from 'express';
import { authenticateToken, adminAuth, superAdminAuth } from '../middleware/auth';
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

// Admin Routes (Restricted to Super Admin)
router.get('/admin/requests', authenticateToken, superAdminAuth, getPendingRequests);
router.post('/admin/approve/:requestId', authenticateToken, superAdminAuth, approveRequest);
router.post('/admin/reject/:requestId', authenticateToken, superAdminAuth, rejectRequest);
router.get('/admin/users', authenticateToken, superAdminAuth, getUsersWithBalance);
router.post('/admin/direct-topup', authenticateToken, superAdminAuth, directTopUp);

export default router;
