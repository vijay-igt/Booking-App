import { Router } from 'express';
import { createBooking, getUserBookings } from '../controllers/bookingController';

const router = Router();

router.post('/', createBooking);
router.get('/user/:userId', getUserBookings);

export default router;
