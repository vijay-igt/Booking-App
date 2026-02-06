import { Router } from 'express';
import { getUserNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getUserNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/all', deleteAllNotifications);
router.delete('/:id', deleteNotification);

export default router;
