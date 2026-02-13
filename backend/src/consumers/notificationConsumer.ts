import { getConsumer } from '../config/kafkaClient';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { sendNotificationToUser } from '../services/websocketService';

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

                try {
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
                    }

                    else if (topic === 'broadcast-notifications') {
                        const users = await User.findAll({ attributes: ['id'] });
                        const notifications = users.map(user => ({
                            userId: user.id,
                            title: data.title,
                            message: data.message,
                            type: data.type || 'info',
                            isRead: false
                        }));
                        await Notification.bulkCreate(notifications);
                        console.log(`[Consumer] Broadcasted notification to ${users.length} users`);
                        users.forEach(user => sendNotificationToUser(user.id, { type: 'NOTIFICATION_RECEIVED', title: data.title }));
                    }

                    else if (topic === 'booking-events' && data.type === 'BOOKING_CONFIRMED') {
                        const showtime = await Showtime.findByPk(data.showtimeId, {
                            include: [{ model: Movie }]
                        });

                        const movieTitle = showtime?.movie?.title || 'Unknown Movie';
                        const startTime = showtime ? new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        const startDate = showtime ? new Date(showtime.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

                        await Notification.create({
                            userId: data.userId,
                            title: 'Booking Confirmed!',
                            message: `Your booking for ${movieTitle} on ${startDate} at ${startTime} was successful. Check your history for details.`,
                            type: 'success',
                            isRead: false
                        });
                        console.log(`[Consumer] Created booking notification for user ${data.userId}`);
                        sendNotificationToUser(data.userId, { type: 'NOTIFICATION_RECEIVED', title: 'Booking Confirmed!' });
                    } else if (topic === 'wallet-updates' && data.type === 'TOPUP_APPROVED') {
                        await Notification.create({
                            userId: data.userId,
                            title: 'Wallet Top-Up Approved!',
                            message: `Your top-up request has been approved. Your new balance is $${data.newBalance}.`,
                            type: 'success',
                            isRead: false
                        });
                        console.log(`[Consumer] Created wallet top-up approved notification for user ${data.userId}`);
                        sendNotificationToUser(data.userId, { type: 'NOTIFICATION_RECEIVED', title: 'Wallet Top-Up Approved!' });
                    } else if (topic === 'wallet-updates' && data.type === 'TOPUP_REJECTED') {
                        await Notification.create({
                            userId: data.userId,
                            title: 'Wallet Top-Up Rejected',
                            message: `Your top-up request has been rejected. Reason: ${data.reason || 'No reason provided.'}`,
                            type: 'warning',
                            isRead: false
                        });
                        console.log(`[Consumer] Created wallet top-up rejected notification for user ${data.userId}`);
                        sendNotificationToUser(data.userId, { type: 'NOTIFICATION_RECEIVED', title: 'Wallet Top-Up Rejected' });
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
