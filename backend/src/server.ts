import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/database';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import bookingRoutes from './routes/bookingRoutes';
import movieRoutes from './routes/movieRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Update CORS for production
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*',
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', movieRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('Movie Booking API is running');
});

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
        // Sync models (force: false to avoid dropping tables) - maybe use alter: true in dev
        await sequelize.sync({ alter: true });

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

startServer();
