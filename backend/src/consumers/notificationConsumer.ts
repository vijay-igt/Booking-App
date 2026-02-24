import { getConsumer } from '../config/kafkaClient';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { PushSubscription } from '../models/PushSubscription';
import { sendNotificationToUser } from '../services/websocketService';
import admin from '../config/firebaseAdmin';
import { Op } from 'sequelize';

export const startNotificationConsumer = async () => {
    try {
        const consumer = await getConsumer('notification-group');
        if (!consumer) {
            console.warn('[Consumer] Kafka consumer could not be started. Background processing will be disabled.');
            return;
        }

        await consumer.subscribe({ topics: ['single-notifications', 'broadcast-notifications', 'booking-events', 'wallet-updates'], fromBeginning: true });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if (!message.value) return;
                const data = JSON.parse(message.value.toString());
                console.log(`[Consumer] Processing topic: ${topic}`, data);

                try {
                    // Helper to send FCM Push
                    const sendFcmPush = async (userId: number, title: string, message: string) => {
                        try {
                            const subscriptions = await PushSubscription.findAll({ where: { userId } });
                            const tokens = Array.from(new Set(subscriptions.map(s => s.token)));

                            if (tokens.length > 0) {
                                const response = await admin.messaging().sendEachForMulticast({
                                    tokens,
                                    notification: { title, body: message },
                                    data: {
                                        title,
                                        message,
                                        type: 'notification'
                                    }
                                });
                                console.log(`[FCM] Successfully sent ${response.successCount} messages to user ${userId}`);

                                // Cleanup invalid tokens
                                if (response.failureCount > 0) {
                                    const tokensToRemove: string[] = [];
                                    response.responses.forEach((resp, idx) => {
                                        if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token' || resp.error?.code === 'messaging/registration-token-not-registered') {
                                            tokensToRemove.push(tokens[idx]);
                                        }
                                    });
                                    if (tokensToRemove.length > 0) {
                                        await PushSubscription.destroy({ where: { token: tokensToRemove } });
                                        console.log(`[FCM] Cleaned up ${tokensToRemove.length} stale tokens for user ${userId}`);
                                    }
                                }
                            }
                        } catch (fcmError) {
                            console.error(`[FCM] Error sending push to user ${userId}:`, fcmError);
                        }
                    };

                    if (topic === 'single-notifications') {
                        await Notification.create({
                            userId: data.userId,
                            title: data.title,
                            message: data.message,
                            type: data.type || 'info',
                            isRead: false
                        });
                        console.log(`[Consumer] Created single notification for user ${data.userId}`);
                        sendNotificationToUser(data.userId, { type: 'NOTIFICATION_RECEIVED', title: data.title });
                        await sendFcmPush(data.userId, data.title, data.message);
                    }

                    else if (topic === 'broadcast-notifications') {
                        const resolveAudience = (value?: string, legacy?: string) => {
                            if (value === 'admins' || value === 'both' || value === 'users') return value;
                            if (legacy === 'admin') return 'admins';
                            if (legacy === 'all') return 'both';
                            if (legacy === 'user') return 'users';
                            return 'users';
                        };

                        const normalizedAudience = resolveAudience(data.audience, data.targetRole);
                        const roles = normalizedAudience === 'admins'
                            ? ['admin', 'super_admin']
                            : normalizedAudience === 'both'
                                ? ['user', 'admin', 'super_admin']
                                : ['user'];
                        const users = await User.findAll({
                            where: { role: { [Op.in]: roles } },
                            attributes: ['id']
                        });
                        const notifications = users.map(user => ({
                            userId: user.id,
                            title: data.title,
                            message: data.message,
                            type: data.type || 'info',
                            isRead: false
                        }));
                        await Notification.bulkCreate(notifications);
                        console.log(`[Consumer] Broadcasted notification to ${users.length} recipients with audience: ${normalizedAudience}`);

                        // WebSocket + FCM for all users
                        for (const user of users) {
                            sendNotificationToUser(user.id, { type: 'NOTIFICATION_RECEIVED', title: data.title });
                            await sendFcmPush(user.id, data.title, data.message);
                        }
                    }

                    else if (topic === 'booking-events' && data.type === 'BOOKING_CONFIRMED') {
                        const showtime = await Showtime.findByPk(data.showtimeId, {
                            include: [{ model: Movie }]
                        });

                        const movieTitle = showtime?.movie?.title || 'Unknown Movie';
                        const startTime = showtime ? new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        const startDate = showtime ? new Date(showtime.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
                        const message = `Your booking for ${movieTitle} on ${startDate} at ${startTime} was successful. Check your history for details.`;

                        await Notification.create({
                            userId: data.userId,
                            title: 'Booking Confirmed!',
                            message,
                            type: 'success',
                            isRead: false
                        });
                        console.log(`[Consumer] Created booking notification for user ${data.userId}`);
                        sendNotificationToUser(data.userId, { type: 'NOTIFICATION_RECEIVED', title: 'Booking Confirmed!' });
                        await sendFcmPush(data.userId, 'Booking Confirmed!', message);
                    } else if (topic === 'booking-events' && data.type === 'BOOKING_CANCELLED_ADMIN') {
                        const showtime = await Showtime.findByPk(data.showtimeId, {
                            include: [{ model: Movie }]
                        });

                        const movieTitle = showtime?.movie?.title || 'Unknown Movie';
                        const startTime = showtime ? new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        const startDate = showtime ? new Date(showtime.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
                        const message = `Your booking for ${movieTitle} on ${startDate} at ${startTime} was cancelled by the admin. Your payment has been refunded to your wallet.`;

                        await Notification.create({
                            userId: data.userId,
                            title: 'Booking Cancelled',
                            message,
                            type: 'info',
                            isRead: false
                        });
                        console.log(`[Consumer] Created admin booking cancellation notification for user ${data.userId}`);
                        sendNotificationToUser(data.userId, { type: 'NOTIFICATION_RECEIVED', title: 'Booking Cancelled' });
                        await sendFcmPush(data.userId, 'Booking Cancelled', message);
                    } else if (topic === 'wallet-updates' && data.type === 'TOPUP_APPROVED') {
                        const message = `Your top-up request has been approved. Your new balance is $${data.newBalance}.`;
                        await Notification.create({
                            userId: data.userId,
                            title: 'Wallet Top-Up Approved!',
                            message,
                            type: 'success',
                            isRead: false
                        });
                        console.log(`[Consumer] Created wallet top-up approved notification for user ${data.userId}`);
                        sendNotificationToUser(data.userId, { type: 'NOTIFICATION_RECEIVED', title: 'Wallet Top-Up Approved!' });
                        await sendFcmPush(data.userId, 'Wallet Top-Up Approved!', message);
                    } else if (topic === 'wallet-updates' && data.type === 'TOPUP_REJECTED') {
                        const message = `Your top-up request has been rejected. Reason: ${data.reason || 'No reason provided.'}`;
                        await Notification.create({
                            userId: data.userId,
                            title: 'Wallet Top-Up Rejected',
                            message,
                            type: 'warning',
                            isRead: false
                        });
                        console.log(`[Consumer] Created wallet top-up rejected notification for user ${data.userId}`);
                        sendNotificationToUser(data.userId, { type: 'NOTIFICATION_RECEIVED', title: 'Wallet Top-Up Rejected' });
                        await sendFcmPush(data.userId, 'Wallet Top-Up Rejected', message);
                    }
                } catch (error) {
                    console.error(`[Consumer] Error processing message from topic ${topic}:`, error);
                }
            },
        });
    } catch (err) {
        console.error('[Consumer] Fatal error starting Kafka consumer:', err);
    }
};
