import { Router } from 'express';
import { createBooking, getUserBookings, cancelUserBooking } from '../controllers/bookingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', createBooking);
router.get('/user/:userId', getUserBookings);
router.put('/:id/cancel', authenticateToken, cancelUserBooking);

export default router;
