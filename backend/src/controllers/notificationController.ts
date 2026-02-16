import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { PushSubscription } from '../models/PushSubscription';
import { getProducer } from '../config/kafkaClient';
import { Op } from 'sequelize';
import admin from '../config/firebaseAdmin';

export const getUserNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const notifications = await Notification.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const notification = await Notification.findOne({
            where: { id, userId }
        });

        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        notification.isRead = true;
        await notification.save();

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error updating notification' });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        await Notification.update(
            { isRead: true },
            { where: { userId, isRead: false } }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Error updating notifications' });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const result = await Notification.destroy({
            where: { id, userId }
        });

        if (result === 0) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Error deleting notification' });
    }
};

export const deleteAllNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        await Notification.destroy({
            where: { userId }
        });

        res.json({ message: 'All notifications deleted' });
    } catch (error) {
        console.error('Error deleting all notifications:', error);
        res.status(500).json({ message: 'Error deleting notifications' });
    }
};

export const createAdminNotification = async (req: Request, res: Response) => {
    try {
        const { userId, title, message, type } = req.body;

        if (!userId || !title || !message) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        const producer = await getProducer();
        if (producer) {
            await producer.send({
                topic: 'single-notifications',
                messages: [{ value: JSON.stringify({ userId, title, message, type: type || 'info' }) }]
            });
            res.status(202).json({ message: 'Notification queued for delivery' });
        } else {
            // Fallback: Direct DB creation if Kafka is down
            await Notification.create({
                userId,
                title,
                message,
                type: type || 'info',
                isRead: false
            });

            // Send FCM in fallback
            const subscriptions = await PushSubscription.findAll({ where: { userId } });
            const tokens = Array.from(new Set(subscriptions.map(s => s.token)));
            if (tokens.length > 0) {
                await admin.messaging().sendEachForMulticast({
                    tokens,
                    notification: { title, body: message },
                    data: { title, message, type: 'single' }
                }).catch((err: any) => console.error(`[FCM Fallback] Error sending to user ${userId}:`, err));
            }

            res.status(201).json({ message: 'Notification sent (fallback)' });
        }
    } catch (error) {
        console.error('Error creating admin notification:', error);
        res.status(500).json({ message: 'Error sending notification' });
    }
};

export const broadcastNotification = async (req: Request, res: Response) => {
    try {
        const { title, message, type, audience, targetRole } = req.body;

        if (!title || !message) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        const resolveAudience = (value?: string, legacy?: string) => {
            if (value === 'admins' || value === 'both' || value === 'users') return value;
            if (legacy === 'admin') return 'admins';
            if (legacy === 'all') return 'both';
            if (legacy === 'user') return 'users';
            return 'users';
        };

        const normalizedAudience = resolveAudience(audience, targetRole);
        const roles = normalizedAudience === 'admins'
            ? ['admin', 'super_admin']
            : normalizedAudience === 'both'
                ? ['user', 'admin', 'super_admin']
                : ['user'];

        const producer = await getProducer();
        if (producer) {
            await producer.send({
                topic: 'broadcast-notifications',
                messages: [{ value: JSON.stringify({ title, message, type: type || 'info', audience: normalizedAudience }) }]
            });
            res.status(202).json({ message: 'Broadcast initiated successfully' });
        } else {
            // Fallback: Direct DB creation
            const users = await User.findAll({
                where: { role: { [Op.in]: roles } },
                attributes: ['id']
            });
            const notifications = users.map(user => ({
                userId: user.id,
                title,
                message,
                type: type || 'info',
                isRead: false
            }));
            await Notification.bulkCreate(notifications);

            // Also send FCM in fallback
            for (const user of users) {
                const subscriptions = await PushSubscription.findAll({ where: { userId: user.id } });
                const tokens = Array.from(new Set(subscriptions.map(s => s.token)));
                if (tokens.length > 0) {
                    await admin.messaging().sendEachForMulticast({
                        tokens,
                        notification: { title, body: message },
                        data: { title, message, type: 'broadcast' }
                    }).catch((err: any) => console.error(`[FCM Fallback] Error sending to user ${user.id}:`, err));
                }
            }

            res.status(201).json({ message: `Broadcast sent to ${users.length} recipients (fallback)` });
        }
    } catch (error) {
        console.error('Error broadcasting notification:', error);
        res.status(500).json({ message: 'Error broadcasting notification' });
    }
};

export const subscribeToPush = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { token, platform } = req.body;

        console.log(`[Push] Subscribe attempt: User ${userId}, Platform ${platform}`);

        if (!userId || !token) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        // 1. Remove this token from ANY other users (enforce single ownership)
        const deletedCount = await PushSubscription.destroy({
            where: {
                token: token,
                userId: { [Op.ne]: userId }
            }
        });
        if (deletedCount > 0) {
            console.log(`[Push] Removed ${deletedCount} existing associations for token from other users.`);
        }

        // 2. Upsert the token for this user
        const [subscription, created] = await PushSubscription.findOrCreate({
            where: { token, userId },
            defaults: { userId, token, platform, lastActive: new Date() }
        });

        if (!created) {
            console.log(`[Push] Updating existing subscription for user ${userId}`);
            subscription.lastActive = new Date();
            subscription.platform = platform || subscription.platform;
            await subscription.save();
        } else {
            console.log(`[Push] Created new subscription for user ${userId}`);
        }

        res.status(200).json({ message: 'Push subscription updated successfully' });
    } catch (error) {
        console.error('Error subscribing to push:', error);
        res.status(500).json({ message: 'Error subscribing to push notifications' });
    }
};

export const unsubscribeFromPush = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { token } = req.body;

        if (!userId || !token) {
            res.status(400).json({ message: 'Missing token' });
            return;
        }

        await PushSubscription.destroy({
            where: { userId, token }
        });

        res.json({ message: 'Unsubscribed from push notifications' });
    } catch (error) {
        console.error('Error unsubscribing from push:', error);
        res.status(500).json({ message: 'Error unsubscribing from push notifications' });
    }
};
