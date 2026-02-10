import { getConsumer } from '../utils/kafka';
import { User } from '../models/User';
import { sendEmail } from '../services/emailService';

export const startEmailConsumer = async () => {
    try {
        const consumer = await getConsumer('email-group');
        if (!consumer) return;

        await consumer.subscribe({ topics: ['booking-events'], fromBeginning: true });

        await consumer.run({
            eachMessage: async ({ topic, message }) => {
                if (!message.value) return;
                const data = JSON.parse(message.value.toString());

                if (data.type === 'BOOKING_CONFIRMED') {
                    const user = await User.findByPk(data.userId);
                    const email = user?.email || 'user@example.com';
                    const subject = `Booking Confirmation: ${data.movieTitle}`;
                    const htmlContent = `
                        <h1>Booking Confirmation</h1>
                        <p>Dear ${user?.name || 'Customer'},</p>
                        <p>Your booking for <strong>${data.movieTitle}</strong> has been confirmed!</p>
                        <p><strong>Booking ID:</strong> ${data.trackingId}</p>
                        <p><strong>Showtime:</strong> ${new Date(data.showtime).toLocaleString()}</p>
                        <p><strong>Seats:</strong> ${data.seats.join(', ')}</p>
                        <p>Thank you for booking with CinePass!</p>
                    `;

                    console.log(`[EmailWorker] 📧 Attempting to send ticket confirmation email to ${email}...`);
                    try {
                        await sendEmail(email, subject, htmlContent);
                        console.log(`[EmailWorker] ✅ Email successfully sent to ${email} for Booking ${data.trackingId || 'N/A'}`);
                    } catch (error) {
                        console.error(`[EmailWorker] ❌ Failed to send email to ${email} for Booking ${data.trackingId || 'N/A'}:`, error);
                    }
                }
            },
        });
    } catch (err) {
        console.error('[EmailConsumer] Fatal error:', err);
    }
};
