import { Router } from 'express';
import { getUserNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, subscribeToPush, unsubscribeFromPush } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getUserNotifications);
router.post('/subscribe', subscribeToPush);
router.post('/unsubscribe', unsubscribeFromPush);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/all', deleteAllNotifications);
router.delete('/:id', deleteNotification);

export default router;
