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
/**
 * @openapi
 * /api/wallet/balance:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get current user wallet balance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/balance', authenticateToken, getBalance);

/**
 * @openapi
 * /api/wallet/topup:
 *   post:
 *     tags:
 *       - Wallet
 *     summary: Request a wallet top-up
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *               - transactionRef
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *               transactionRef:
 *                 type: string
 *     responses:
 *       201:
 *         description: Top-up request created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/topup', authenticateToken, requestTopUp);

// Admin Routes (Restricted to Super Admin)
/**
 * @openapi
 * /api/wallet/admin/requests:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get all pending top-up requests (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending requests retrieved successfully
 */
router.get('/admin/requests', authenticateToken, superAdminAuth, getPendingRequests);

/**
 * @openapi
 * /api/wallet/admin/approve/{requestId}:
 *   post:
 *     tags:
 *       - Wallet
 *     summary: Approve a top-up request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: requestId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Request approved
 */
router.post('/admin/approve/:requestId', authenticateToken, superAdminAuth, approveRequest);
router.post('/admin/reject/:requestId', authenticateToken, superAdminAuth, rejectRequest);

/**
 * @openapi
 * /api/wallet/admin/users:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get all users with their balances
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User list retrieved
 */
router.get('/admin/users', authenticateToken, superAdminAuth, getUsersWithBalance);
/**
 * @openapi
 * /api/wallet/admin/direct-topup:
 *   post:
 *     tags:
 *       - Wallet
 *     summary: Directly top up a user's wallet (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet topped up successfully
 */
router.post('/admin/direct-topup', authenticateToken, superAdminAuth, directTopUp);

export default router;
