import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { Seat } from '../models/Seat';
import { Ticket } from '../models/Ticket';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { Screen } from '../models/Screen';
import { Theater } from '../models/Theater';
import { sequelize } from '../config/database';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
    const transaction = await sequelize.transaction();
    try {
        const { userId, showtimeId, seatIds, totalAmount } = req.body;

        // Check if any seat is already booked for THIS showtime
        const existingTickets = await Ticket.findAll({
            include: [{
                model: Booking,
                where: { showtimeId, status: 'confirmed' }
            }],
            where: { seatId: seatIds },
            transaction,
        });

        if (existingTickets.length > 0) {
            await transaction.rollback();
            res.status(400).json({ message: 'One or more seats are already booked for this show.' });
            return;
        }

        // Create Booking
        const booking = await Booking.create({
            userId,
            showtimeId,
            totalAmount,
            status: 'confirmed',
        }, { transaction });

        // Create Tickets (Booked Seats)
        const tickets = seatIds.map((seatId: number) => ({
            bookingId: booking.id,
            showtimeId, // Added for unique constraint check
            seatId,
        }));

        await Ticket.bulkCreate(tickets, { transaction });

        await transaction.commit();
        res.status(201).json(booking);
    } catch (error) {
        console.error('Create Booking Failed:', error);
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: 'Error creating booking', error });
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
