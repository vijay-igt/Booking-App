import { Router } from 'express';
import { lockSeats, unlockSeats } from '../controllers/lockController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/lock:
 *   post:
 *     tags:
 *       - Seat Locking
 *     summary: Temporarily lock seats before booking
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - showtimeId
 *               - seatIds
 *             properties:
 *               showtimeId:
 *                 type: integer
 *               seatIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Seats locked successfully
 */
router.post('/lock', authenticateToken, lockSeats);

/**
 * @openapi
 * /api/unlock:
 *   post:
 *     tags:
 *       - Seat Locking
 *     summary: Manually unlock seats
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - showtimeId
 *               - seatIds
 *             properties:
 *               showtimeId:
 *                 type: integer
 *               seatIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Seats unlocked successfully
 */
router.post('/unlock', authenticateToken, unlockSeats);

export default router;
