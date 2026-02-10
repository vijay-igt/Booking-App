import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { sequelize } from './config/database';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import bookingRoutes from './routes/bookingRoutes';
import movieRoutes from './routes/movieRoutes';
import uploadRoutes from './routes/uploadRoutes';
import notificationRoutes from './routes/notificationRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import walletRoutes from './routes/walletRoutes';
import lockRoutes from './routes/lockRoutes';
import path from 'path';

import { startNotificationConsumer } from './consumers/notificationConsumer';
import { startSeatReservationConsumer } from './consumers/seatReservationConsumer';
import { startAnalyticsConsumer } from './consumers/analyticsConsumer';
import { startEmailConsumer } from './consumers/emailConsumer';
import { startWalletConsumer } from './consumers/walletConsumer';
import { seedAdmin } from './seedAdmin';
import { initializeWebSocket } from './services/websocketService';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - Allow local dev and production frontend
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : 'http://localhost:5173',
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', movieRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api', lockRoutes);

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req: Request, res: Response) => {
    res.send('Movie Booking API is running');
});

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
        // Sync models (force: false to avoid dropping tables) - maybe use alter: true in dev
        await sequelize.sync({ alter: true });

        // Automated Admin Seeding
        await seedAdmin();

        // Start Kafka Consumers
        startNotificationConsumer().catch(err => console.error('Notification Consumer Error:', err));
        startSeatReservationConsumer().catch(err => console.error('Reservation Consumer Error:', err));
        startAnalyticsConsumer().catch(err => console.error('Analytics Consumer Error:', err));
        startEmailConsumer().catch(err => console.error('Email Consumer Error:', err));
        startWalletConsumer().catch(err => console.error('Wallet Consumer Error:', err));

        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        initializeWebSocket(server);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? {} : err
    });
});

startServer();
