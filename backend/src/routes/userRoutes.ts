import { Router } from 'express';
import { requestOwnerStatus } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/users/request-owner:
 *   post:
 *     tags:
 *       - Users
 *     summary: Request to become a theater owner
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Owner status request submitted successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/request-owner', authenticateToken, requestOwnerStatus);

export default router;
