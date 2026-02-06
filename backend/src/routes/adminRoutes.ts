import { Router } from 'express';
import { createTheater, getTheaters, createScreen, updateScreen, deleteScreen, generateSeats, getSeatsByScreen, getAllShowtimes, deleteShowtime, getAllBookings, deleteBooking, getScreenTiers, deleteTheater } from '../controllers/adminController';
import { createShowtime, updateShowtime } from '../controllers/showtimeController';
import { createMovie, updateMovie, deleteMovie } from '../controllers/movieController';

const router = Router();

// TODO: Add authentication middleware to ensure only admins can access these
router.post('/theaters', createTheater);
router.get('/theaters', getTheaters);
router.delete('/theaters/:id', deleteTheater);
router.post('/screens', createScreen);
router.put('/screens/:id', updateScreen);
router.delete('/screens/:id', deleteScreen);
router.post('/screens/:screenId/seats/generate', generateSeats); // Restore correct path
router.get('/screens/:screenId/tiers', getScreenTiers); // Restore route
router.get('/seats/:screenId', getSeatsByScreen);
router.get('/showtimes', getAllShowtimes);
router.post('/showtimes', createShowtime); // Restore route
router.put('/showtimes/:id', updateShowtime); // Restore route
router.delete('/showtimes/:id', deleteShowtime);
router.get('/bookings', getAllBookings);
router.delete('/bookings/:id', deleteBooking);

// Movie Routes for Admin
router.post('/movies', createMovie);
router.put('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

export default router;
