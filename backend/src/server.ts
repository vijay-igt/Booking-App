import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import './config/passport'; // Import our passport configuration

import { sequelize } from './config/database';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import bookingRoutes from './routes/bookingRoutes';
import movieRoutes from './routes/movieRoutes';
import uploadRoutes from './routes/uploadRoutes';
import notificationRoutes from './routes/notificationRoutes';
import walletRoutes from './routes/walletRoutes';
import lockRoutes from './routes/lockRoutes';
import userRoutes from './routes/userRoutes';
import path from 'path';

import jwt from 'jsonwebtoken';
import { User } from './models/User';
import { startNotificationConsumer } from './consumers/notificationConsumer';
import { startSeatReservationConsumer } from './consumers/seatReservationConsumer';
import { startEmailConsumer } from './consumers/emailConsumer';
import { startWalletConsumer } from './consumers/walletConsumer';
import { startAnalyticsConsumer } from './consumers/analyticsConsumer';
import { seedAdmin } from './seedAdmin';
import { initializeWebSocket } from './services/websocketService';

const app = express();
const PORT = process.env.PORT || 5000;

const rawOrigins = process.env.FRONTEND_URL || '';
const allowedOrigins = rawOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Session middleware for Passport
const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!sessionSecret) {
    throw new Error('SESSION_SECRET or JWT_SECRET is required');
}

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' } // Use secure cookies in production
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

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
app.use('/api/wallet', walletRoutes);
app.use('/api', lockRoutes);
app.use('/api/users', userRoutes);

// Google OAuth routes
app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`, session: false }),
    (req, res) => {
        if (!req.user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
        }

        const user = req.user as User; // req.user is now the UserModel instance
        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: '1d' }
        );
        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
);

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
        startNotificationConsumer().catch((err: Error) => console.error('Notification Consumer Error:', err));
        startSeatReservationConsumer().catch((err: Error) => console.error('Reservation Consumer Error:', err));
        startWalletConsumer().catch((err: Error) => console.error('Wallet Consumer Error:', err));
        startEmailConsumer().catch((err: Error) => console.error('Email Consumer Error:', err));
        startAnalyticsConsumer().catch((err: Error) => console.error('Analytics Consumer Error:', err));

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
