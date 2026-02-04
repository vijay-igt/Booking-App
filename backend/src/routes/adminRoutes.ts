import { Router } from 'express';
import { createTheater, getTheaters, createScreen, generateSeats, getSeatsByScreen, getAllShowtimes } from '../controllers/adminController';

const router = Router();

// TODO: Add authentication middleware to ensure only admins can access these
router.post('/theaters', createTheater);
router.get('/theaters', getTheaters);
router.post('/screens', createScreen);
router.post('/seats/generate', generateSeats);
router.get('/seats/:screenId', getSeatsByScreen);
router.get('/showtimes', getAllShowtimes);

export default router;
