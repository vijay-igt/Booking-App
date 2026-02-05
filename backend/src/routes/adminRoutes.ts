import { Router } from 'express';
import { createTheater, getTheaters, createScreen, updateScreen, deleteScreen, generateSeats, getSeatsByScreen, getAllShowtimes, deleteShowtime, getAllBookings, deleteBooking } from '../controllers/adminController';

const router = Router();

// TODO: Add authentication middleware to ensure only admins can access these
router.post('/theaters', createTheater);
router.get('/theaters', getTheaters);
router.post('/screens', createScreen);
router.put('/screens/:id', updateScreen);
router.delete('/screens/:id', deleteScreen);
router.post('/seats/generate', generateSeats);
router.get('/seats/:screenId', getSeatsByScreen);
router.get('/showtimes', getAllShowtimes);
router.delete('/showtimes/:id', deleteShowtime);
router.get('/bookings', getAllBookings);
router.delete('/bookings/:id', deleteBooking);

export default router;
