import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { Seat } from '../models/Seat';
import { Ticket } from '../models/Ticket';
import { User } from '../models/User';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { Screen } from '../models/Screen';
import { Theater } from '../models/Theater';
import { sequelize } from '../config/database';
import { Notification } from '../models/Notification';
import { getProducer } from '../utils/kafka';
import { LockService } from '../services/lockService';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, showtimeId, seatIds, totalAmount, paymentMethod } = req.body;

        if (!userId || !showtimeId || !seatIds || !totalAmount) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        // Validate Seat Locks
        const hasLock = await LockService.validateLock(showtimeId, seatIds, userId);
        if (!hasLock) {
            res.status(409).json({ message: 'Session expired or seats are no longer reserved.' });
            return;
        }

        const trackingId = `BOOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Wallet Balance Check (Synchronous pre-check)
        if (paymentMethod === 'WALLET') {
            const user = await User.findByPk(userId);
            if (!user || Number(user.walletBalance) < Number(totalAmount)) {
                res.status(400).json({ message: 'Insufficient wallet balance' });
                return;
            }
        }

        // Produce seat reservation event
        const producer = await getProducer();
        if (producer) {
            await producer.send({
                topic: 'seat-reservations',
                messages: [{
                    value: JSON.stringify({
                        userId,
                        showtimeId,
                        seatIds,
                        totalAmount,
                        paymentMethod,
                        trackingId
                    })
                }]
            });

            console.log(`[BookingController] Dispatched reservation request: ${trackingId}`);

            res.status(202).json({
                message: 'Your booking is being processed. You will be notified shortly.',
                trackingId
            });
        } else {
            // Fallback (Direct DB insert if Kafka is down)
            const transaction = await sequelize.transaction();
            try {
                // Check if any seat is already booked for THIS showtime
                const existingTickets = await Ticket.findAll({
                    include: [{ model: Booking, where: { showtimeId, status: 'confirmed' } }],
                    where: { seatId: seatIds },
                });

                if (existingTickets.length > 0) {
                    await transaction.rollback();
                    res.status(400).json({ message: 'One or more seats are already booked.' });
                    return;
                }

                const booking = await Booking.create({ userId, showtimeId, totalAmount, status: 'confirmed' }, { transaction });
                const tickets = seatIds.map((seatId: number) => ({ bookingId: booking.id, showtimeId, seatId }));
                await Ticket.bulkCreate(tickets, { transaction });
                await transaction.commit();

                res.status(201).json({ message: 'Booking successful (fallback)', booking });
            } catch (err) {
                if (transaction) await transaction.rollback();
                throw err;
            }
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Error creating booking' });
    }
};

export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const bookings = await Booking.findAll({
            where: { userId },
            include: [{
                model: Ticket,
                include: [Seat]
            }, {
                model: Showtime,
                include: [
                    { model: Movie },
                    { model: Screen, include: [Theater] }
                ]
            }],
        });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error });
    }
};
