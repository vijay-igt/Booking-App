import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true', // Use 'true' for 465, 'false' for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"CinePass" <no-reply@cinepass.com>',
            to,
            subject,
            html,
        });
        console.log(`[EmailService] Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
        console.error(`[EmailService] Error sending email to ${to}:`, error);
        throw error;
    }
};
