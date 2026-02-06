import { Request, Response } from 'express';
import { Notification } from '../models/Notification';

export const getUserNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
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
        const userId = (req as any).user?.id;

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
        const userId = (req as any).user?.id;

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
        const userId = (req as any).user?.id;

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
        const userId = (req as any).user?.id;

        await Notification.destroy({
            where: { userId }
        });

        res.json({ message: 'All notifications deleted' });
    } catch (error) {
        console.error('Error deleting all notifications:', error);
        res.status(500).json({ message: 'Error deleting notifications' });
    }
};
