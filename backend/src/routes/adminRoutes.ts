import { Router } from 'express';
import { createTheater, getTheaters, createScreen, updateScreen, deleteScreen, generateSeats, getSeatsByScreen, getAllShowtimes, deleteShowtime, getAllBookings, deleteBooking, getScreenTiers, deleteTheater, getUsers, updateUserCommission, getDashboardStats, approveOwnerRequest, requestMissingMovie } from '../controllers/adminController';
import { createShowtime, updateShowtime } from '../controllers/showtimeController';
import { createMovie, updateMovie, deleteMovie } from '../controllers/movieController';
import { createAdminNotification, broadcastNotification } from '../controllers/notificationController';
import { adminAuth, superAdminAuth } from '../middleware/auth';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuth);

/**
 * @openapi
 * /api/admin/theaters:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create a new theater
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Theater created successfully
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all theaters managed by the admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of theaters retrieved successfully
 */
/**
 * @openapi
 * /api/admin/theaters/{id}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete a theater
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
 *         description: Theater deleted successfully
 */
router.post('/theaters', createTheater);
router.get('/theaters', getTheaters);
router.delete('/theaters/:id', deleteTheater);

/**
 * @openapi
 * /api/admin/screens:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create a new screen
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - theaterId
 *               - layout
 *             properties:
 *               name:
 *                 type: string
 *               theaterId:
 *                 type: integer
 *               seatLayout:
 *                 type: object
 *                 description: Initial layout configuration (optional)
 *     responses:
 *       201:
 *         description: Screen created successfully
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update a screen
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               layout:
 *                 type: object
 *     responses:
 *       200:
 *         description: Screen updated successfully
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete a screen
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
 *         description: Screen deleted successfully
 */
router.post('/screens', createScreen);
router.put('/screens/:id', updateScreen);
router.delete('/screens/:id', deleteScreen);

/**
 * @openapi
 * /api/admin/screens/{screenId}/seats/generate:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Generate seats for a screen
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: screenId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Seats generated successfully
 */
router.post('/screens/:screenId/seats/generate', generateSeats);
/**
 * @openapi
 * /api/admin/screens/{screenId}/tiers:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get distinct tiers and prices for a screen
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: screenId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of tiers retrieved successfully
 */
router.get('/screens/:screenId/tiers', getScreenTiers);

/**
 * @openapi
 * /api/admin/seats/{screenId}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all seats for a specific screen
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: screenId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of seats retrieved successfully
 */
router.get('/seats/:screenId', getSeatsByScreen);

/**
 * @openapi
 * /api/admin/showtimes:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all showtimes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of showtimes retrieved successfully
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create a new showtime
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieId
 *               - screenId
 *               - startTime
 *               - basePrice
 *             properties:
 *               movieId:
 *                 type: integer
 *               screenId:
 *                 type: integer
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               tierPrices:
 *                 type: object
 *                 description: Mapping of seat tiers to prices
 *               occupancyThreshold:
 *                 type: number
 *     responses:
 *       201:
 *         description: Showtime created successfully
 */
router.get('/showtimes', getAllShowtimes);
router.post('/showtimes', createShowtime);

/**
 * @openapi
 * /api/admin/showtimes/{id}:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update a showtime
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
 *         description: Showtime updated successfully
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete a showtime
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
 *         description: Showtime deleted successfully
 */
router.put('/showtimes/:id', updateShowtime);
router.delete('/showtimes/:id', deleteShowtime);

/**
 * @openapi
 * /api/admin/bookings:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all bookings (Admin sees own theater bookings, Super Admin sees all)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings retrieved successfully
 */
router.get('/bookings', getAllBookings);

/**
 * @openapi
 * /api/admin/bookings/{id}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete a booking
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
 *         description: Booking deleted successfully
 */
router.get('/bookings', getAllBookings);
router.delete('/bookings/:id', deleteBooking);

// Movie Routes for Admin
/**
 * @openapi
 * /api/admin/movies/request:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Request a missing movie from TMDB or external source
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request submitted
 */
router.post('/movies/request', requestMissingMovie);

/**
 * @openapi
 * /api/admin/movies:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Admin movie creation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - genre
 *               - duration
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               genre:
 *                 type: string
 *               duration:
 *                 type: integer
 *               rating:
 *                 type: string
 *               posterUrl:
 *                 type: string
 *               bannerUrl:
 *                 type: string
 *               trailerUrl:
 *                 type: string
 *               releaseDate:
 *                 type: string
 *                 format: date
 *               language:
 *                 type: string
 *               audio:
 *                 type: string
 *               format:
 *                 type: string
 *     responses:
 *       201:
 *         description: Movie created
 */
router.post('/movies', createMovie);
router.put('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

// User & Notification Routes for Admin
/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all users (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: search
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: role
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [all, customer, owner, super_admin]
 *     responses:
 *       200:
 *         description: User list retrieved successfully
 */
router.get('/users', getUsers);
/**
 * @openapi
 * /api/admin/users/{id}/commission:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update user commission percentage (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commissionRate
 *             properties:
 *               commissionRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Commission updated
 */
router.put('/users/:id/commission', superAdminAuth, updateUserCommission);

/**
 * @openapi
 * /api/admin/users/{id}/approve:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Approve owner status request (Super Admin only)
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
 *         description: Owner approved
 */
router.put('/users/:id/approve', superAdminAuth, approveOwnerRequest);

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get dashboard statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 */
router.get('/stats', getDashboardStats);
/**
 * @openapi
 * /api/admin/notifications:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create an admin notification
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
 *               - title
 *               - message
 *             properties:
 *               userId:
 *                 type: integer
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification created
 */
router.post('/notifications', createAdminNotification);

/**
 * @openapi
 * /api/admin/broadcast:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Broadcast notification to all users (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               role:
 *                 type: string
 *                 description: Target role to broadcast to
 *     responses:
 *       200:
 *         description: Broadcast sent
 */
router.post('/broadcast', superAdminAuth, broadcastNotification);

export default router;
