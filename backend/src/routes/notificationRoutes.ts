import { Router } from 'express';
import { getUserNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, subscribeToPush, unsubscribeFromPush, getUnreadCount } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get all notifications for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications retrieved successfully
 */
router.get('/', getUserNotifications);

/**
 * @openapi
 * /api/notifications/unread/count:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get the count of unread notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count retrieved successfully
 */
router.get('/unread/count', getUnreadCount);
/**
 * @openapi
 * /api/notifications/subscribe:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Subscribe to push notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Firebase Cloud Messaging (FCM) token
 *     responses:
 *       200:
 *         description: Subscribed successfully
 */
router.post('/subscribe', subscribeToPush);
router.post('/unsubscribe', unsubscribeFromPush);

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   put:
 *     tags:
 *       - Notifications
 *     summary: Mark a notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

/**
 * @openapi
 * /api/notifications/all:
 *   delete:
 *     tags:
 *       - Notifications
 *     summary: Delete all notifications for the user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications deleted
 */
router.delete('/all', deleteAllNotifications);
router.delete('/:id', deleteNotification);

export default router;
