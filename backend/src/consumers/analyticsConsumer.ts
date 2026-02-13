import { getConsumer } from '../config/kafkaClient';

export interface ActivityLog {
    userId?: number;
    email?: string;
    movieId?: number;
    title?: string;
    type: string;
    timestamp: string;
}

export let activities: ActivityLog[] = [];

export const startAnalyticsConsumer = async () => {
    try {
        const consumer = await getConsumer('analytics-group');
        if (!consumer) return;

        await consumer.subscribe({ topics: ['user-activity', 'booking-events', 'seat-reservations'], fromBeginning: true });

        await consumer.run({
            eachMessage: async ({ topic, message }) => {
                if (!message.value) return;
                const data = JSON.parse(message.value.toString());

                // Enrich data based on topic if type is missing
                let eventType = data.type;
                if (!eventType) {
                    if (topic === 'seat-reservations') eventType = 'SEAT_LOCK_REQUESTED';
                    else if (topic === 'booking-events') eventType = 'BOOKING_PROCESS';
                    else eventType = 'SYSTEM_EVENT';
                }

                const log: ActivityLog = {
                    ...data,
                    type: eventType,
                    timestamp: data.timestamp || new Date().toISOString()
                };

                // Add to memory log (keep last 50)
                activities.unshift(log);
                if (activities.length > 50) activities.pop();

                console.log(`[Analytics] ${new Date(log.timestamp).toLocaleTimeString()} - ${log.type} ${log.title || log.email || ''}`);
            },
        });
    } catch (err) {
        console.error('[AnalyticsConsumer] Fatal error:', err);
    }
};
