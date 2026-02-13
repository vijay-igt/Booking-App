import { getConsumer } from '../config/kafkaClient';
import { User } from '../models/User';
import { sendEmail } from '../services/emailService';

export const startEmailConsumer = async () => {
    try {
        const consumer = await getConsumer('email-group');
        if (!consumer) return;

        await consumer.subscribe({ topics: ['booking-events', 'auth-events'], fromBeginning: true });

        await consumer.run({
            eachMessage: async ({ topic, message }) => {
                if (!message.value) return;
                const data = JSON.parse(message.value.toString());

                if (topic === 'auth-events' && data.type === 'PASSWORD_RESET_REQUESTED') {
                    const subject = 'Password Reset Request - CinePass';
                    const htmlContent = `
                        <h1>Password Reset</h1>
                        <p>Hi,</p>
                        <p>You requested a password reset for your CinePass account.</p>
                        <p>Please click the link below to reset your password. This link is valid for 1 hour.</p>
                        <a href="${data.resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #e50914; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                        <p>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p>${data.resetLink}</p>
                        <p>If you did not request this, please ignore this email.</p>
                    `;

                    console.log(`[EmailWorker] 📧 Sending password reset email to ${data.email}...`);
                    await sendEmail(data.email, subject, htmlContent);
                } else if (topic === 'auth-events' && data.type === 'USER_REGISTERED') {
                    const subject = 'Verify Your Email - CinePass';
                    const htmlContent = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h1 style="color: #e50914; text-align: center;">Welcome to CinePass!</h1>
                            <p>Hi,</p>
                            <p>Thank you for joining CinePass. To get started, please verify your email address by clicking the button below:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${data.verificationLink}" style="background-color: #e50914; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
                            </div>
                            <p>This link is valid for 24 hours.</p>
                            <p>If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; color: #666;">${data.verificationLink}</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center;">If you did not create an account, please ignore this email.</p>
                        </div>
                    `;

                    console.log(`[EmailWorker] 📧 Sending verification email to ${data.email}...`);
                    await sendEmail(data.email, subject, htmlContent);
                } else if (data.type === 'BOOKING_CONFIRMED') {
                    const user = await User.findByPk(data.userId);
                    const email = user?.email || 'user@example.com';
                    const subject = `Booking Confirmation: ${data.movieTitle}`;
                    const htmlContent = `
                        <h1>Booking Confirmation</h1>
                        <p>Dear ${user?.name || 'Customer'},</p>
                        <p>Your booking for <strong>${data.movieTitle}</strong> has been confirmed!</p>
                        <p><strong>Booking ID:</strong> ${data.trackingId}</p>
                        <p><strong>Showtime:</strong> ${new Date(data.showtime).toLocaleString()}</p>
                        <p><strong>Seats:</strong> ${(data.seats && Array.isArray(data.seats) ? data.seats.join(', ') : 'N/A')}</p>
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
