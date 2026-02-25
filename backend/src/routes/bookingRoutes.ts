import { Router } from 'express';
import { createBooking, getUserBookings, cancelUserBooking } from '../controllers/bookingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Create a new booking
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
 *               foodItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     foodItemId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Showtime or seat not found
 *       409:
 *         description: Conflict (seat already booked)
 */
router.post('/', authenticateToken, createBooking);

/**
 * @openapi
 * /api/bookings/user/{userId}:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get bookings for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 */
/**
 * @openapi
 * /api/bookings/{id}/cancel:
 *   put:
 *     tags:
 *       - Bookings
 *     summary: Cancel a user booking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 */
router.put('/:id/cancel', authenticateToken, cancelUserBooking);

export default router;
