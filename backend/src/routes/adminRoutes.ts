import { Router } from 'express';
import { createTheater, getTheaters, createScreen, updateScreen, deleteScreen, generateSeats, getSeatsByScreen, getAllShowtimes, deleteShowtime, getAllBookings, deleteBooking, getScreenTiers, deleteTheater, getUsers, updateUserCommission, getDashboardStats, approveOwnerRequest, requestMissingMovie } from '../controllers/adminController';
import { createShowtime, updateShowtime } from '../controllers/showtimeController';
import { createMovie, updateMovie, deleteMovie } from '../controllers/movieController';
import { createAdminNotification, broadcastNotification } from '../controllers/notificationController';
import { adminAuth, superAdminAuth } from '../middleware/auth';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuth);

router.post('/theaters', createTheater);
router.get('/theaters', getTheaters);
router.delete('/theaters/:id', deleteTheater);
router.post('/screens', createScreen);
router.put('/screens/:id', updateScreen);
router.delete('/screens/:id', deleteScreen);
router.post('/screens/:screenId/seats/generate', generateSeats);
router.get('/screens/:screenId/tiers', getScreenTiers);
router.get('/seats/:screenId', getSeatsByScreen);
router.get('/showtimes', getAllShowtimes);
router.post('/showtimes', createShowtime);
router.put('/showtimes/:id', updateShowtime);
router.delete('/showtimes/:id', deleteShowtime);
router.get('/bookings', getAllBookings);
router.delete('/bookings/:id', deleteBooking);

// Movie Routes for Admin
router.post('/movies/request', requestMissingMovie);
router.post('/movies', createMovie);
router.put('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

// User & Notification Routes for Admin
// Only Super Admin should see all users? Or maybe Theater Owner needs to see users who booked?
// For now, allow admin (Theater Owner) to see users but maybe we should restrict it later.
router.get('/users', getUsers);
router.put('/users/:id/commission', superAdminAuth, updateUserCommission); // Only Super Admin can update commission
router.put('/users/:id/approve', superAdminAuth, approveOwnerRequest); // Super Admin approves owner request
router.get('/stats', getDashboardStats);
router.post('/notifications', createAdminNotification);
router.post('/broadcast', superAdminAuth, broadcastNotification);

export default router;
