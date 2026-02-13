import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { getProducer } from '../config/kafkaClient';

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
            res.status(201).json({ message: 'Notification sent (fallback)' });
        }
    } catch (error) {
        console.error('Error creating admin notification:', error);
        res.status(500).json({ message: 'Error sending notification' });
    }
};

export const broadcastNotification = async (req: Request, res: Response) => {
    try {
        const { title, message, type } = req.body;

        if (!title || !message) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        const producer = await getProducer();
        if (producer) {
            await producer.send({
                topic: 'broadcast-notifications',
                messages: [{ value: JSON.stringify({ title, message, type: type || 'info' }) }]
            });
            res.status(202).json({ message: 'Broadcast initiated successfully' });
        } else {
            // Fallback: Direct DB creation
            const users = await User.findAll({ attributes: ['id'] });
            const notifications = users.map(user => ({
                userId: user.id,
                title,
                message,
                type: type || 'info',
                isRead: false
            }));
            await Notification.bulkCreate(notifications);
            res.status(201).json({ message: `Broadcast sent to ${users.length} users (fallback)` });
        }
    } catch (error) {
        console.error('Error broadcasting notification:', error);
        res.status(500).json({ message: 'Error broadcasting notification' });
    }
};
