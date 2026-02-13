import { getConsumer, getProducer } from '../config/kafkaClient';
import { sendNotificationToUser, sendNotificationToSuperAdmins } from '../services/websocketService';
import { User } from '../models/User'; // Assuming User model is needed to determine admin status

export const startWalletConsumer = async () => {
    try {
        const consumer = await getConsumer('wallet-group');
        if (!consumer) {
            console.warn('[WalletConsumer] Kafka consumer could not be started.');
            return;
        }

        await consumer.subscribe({ topics: ['wallet-updates'], fromBeginning: true });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if (!message.value) return;
                const data = JSON.parse(message.value.toString());
                console.log(`[WalletConsumer] Received message: ${JSON.stringify(data)}`);

                switch (data.type) {
                    case 'TOPUP_REQUESTED':
                        // Notify admins about a new top-up request
                        sendNotificationToSuperAdmins({
                            type: 'ADMIN_TOPUP_REQUEST',
                            message: `New top-up request from user ${data.userId} for ${data.amount} via ${data.paymentMethod}.`,
                            requestId: data.requestId,
                            userId: data.userId,
                            amount: data.amount,
                            timestamp: data.timestamp
                        });
                        break;
                    case 'TOPUP_APPROVED':
                        // Notify the user whose request was approved
                        sendNotificationToUser(data.userId, {
                            type: 'USER_TOPUP_APPROVED',
                            message: `Your top-up request for ${data.amount} has been approved! New balance: ${data.newBalance}.`,
                            requestId: data.requestId,
                            amount: data.amount,
                            newBalance: data.newBalance,
                            timestamp: data.timestamp
                        });
                        break;
                    case 'TOPUP_REJECTED':
                        // Notify the user whose request was rejected
                        sendNotificationToUser(data.userId, {
                            type: 'USER_TOPUP_REJECTED',
                            message: `Your top-up request has been rejected. Please contact support.`,
                            requestId: data.requestId,
                            timestamp: data.timestamp
                        });
                        break;
                    default:
                        console.log(`[WalletConsumer] Unknown wallet update type: ${data.type}`);
                }
            },
        });
    } catch (err) {
        console.error('[WalletConsumer] Fatal error starting Kafka consumer:', err);
    }
};
