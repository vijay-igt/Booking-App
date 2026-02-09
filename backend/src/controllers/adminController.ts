import { Request, Response } from 'express';
import { DataType, Sequelize } from 'sequelize-typescript';
import { Theater } from '../models/Theater';
import { Screen } from '../models/Screen';
import { Seat } from '../models/Seat';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { Booking } from '../models/Booking';
import { Ticket } from '../models/Ticket';
import { User } from '../models/User';

export const createTheater = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, location } = req.body;
        const theater = await Theater.create({ name, location });
        res.status(201).json(theater);
    } catch (error) {
        res.status(500).json({ message: 'Error creating theater', error });
    }
};

export const getTheaters = async (req: Request, res: Response): Promise<void> => {
    try {
        const theaters = await Theater.findAll({ include: [Screen] });
        res.json(theaters);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching theaters', error });
    }
};

export const deleteTheater = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const theater = await Theater.findByPk(id);
        if (!theater) {
            res.status(404).json({ message: 'Theater not found' });
            return;
        }
        await theater.destroy();
        res.json({ message: 'Theater deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting theater', error });
    }
};

export const createScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { theaterId, name } = req.body;

        const existingScreen = await Screen.findOne({ where: { theaterId, name } });
        if (existingScreen) {
            res.status(400).json({ message: `A screen with name "${name}" already exists in this theater.` });
            return;
        }

        const screen = await Screen.create({ theaterId, name });
        res.status(201).json(screen);
    } catch (error) {
        res.status(500).json({ message: 'Error creating screen', error });
    }
};

export const updateScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const screen = await Screen.findByPk(parseInt(String(id)));
        if (!screen) {
            res.status(404).json({ message: 'Screen not found' });
            return;
        }

        const existingScreen = await Screen.findOne({
            where: {
                theaterId: screen.theaterId,
                name
            }
        });

        if (existingScreen && existingScreen.id !== screen.id) {
            res.status(400).json({ message: `A screen with name "${name}" already exists in this theater.` });
            return;
        }

        await screen.update({ name });
        res.json(screen);
    } catch (error) {
        res.status(500).json({ message: 'Error updating screen', error });
    }
};

export const deleteScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const screen = await Screen.findByPk(parseInt(String(id)));
        if (!screen) {
            res.status(404).json({ message: 'Screen not found' });
            return;
        }
        await screen.destroy();
        res.json({ message: 'Screen deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting screen', error });
    }
};

export const generateSeats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { screenId } = req.params;
        const { columns, tiers, totalRows } = req.body;
        const cols = columns;

        if (!tiers || tiers.length === 0) {
            res.status(400).json({ message: 'At least one tier must be defined.' });
            return;
        }

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const existingSeats = await Seat.findAll({ where: { screenId } });
        const existingSeatMap = new Map<string, Seat>();
        existingSeats.forEach(seat => {
            existingSeatMap.set(`${seat.row}-${seat.number}`, seat);
        });

        const seatsToCreate = [];
        const seatIdsToKeep = new Set<number>();
        let updatedCount = 0;

        let currentRow = 1;
        // Iterate through tiers using startRow and endRow
        for (const tier of tiers) {
            let start: number, end: number;

            // Handle both old (startRow/endRow) and new (rows) formats
            if (tier.rows) {
                start = currentRow;
                end = currentRow + parseInt(tier.rows) - 1;
                currentRow = end + 1;
            } else {
                start = parseInt(tier.startRow);
                end = parseInt(tier.endRow);
            }

            for (let r = start; r <= end; r++) {
                const rowLabel = characters[r - 1]; // 1-indexed to 0-indexed
                if (!rowLabel) continue;

                for (let c = 1; c <= cols; c++) {
                    const key = `${rowLabel}-${c}`;
                    const existingSeat = existingSeatMap.get(key);

                    if (existingSeat) {
                        updatedCount++;
                        existingSeat.price = tier.price || existingSeat.price;
                        existingSeat.type = tier.tierName || tier.name;
                        await existingSeat.save();
                        seatIdsToKeep.add(existingSeat.id);
                    } else {
                        seatsToCreate.push({
                            screenId: parseInt(String(screenId)),
                            row: rowLabel,
                            number: c,
                            type: tier.tierName || tier.name,
                            price: tier.price || 0,
                        });
                    }
                }
            }
        }

        // 3. Create new seats
        if (seatsToCreate.length > 0) {
            await Seat.bulkCreate(seatsToCreate);
        }

        // 4. Handle seats that are no longer in the layout
        const seatsToRemove = existingSeats.filter(s => !seatIdsToKeep.has(s.id));

        let removedCount = 0;
        for (const seat of seatsToRemove) {
            const ticketCount = await Ticket.count({ where: { seatId: seat.id } });
            if (ticketCount === 0) {
                await seat.destroy();
                removedCount++;
            }
        }

        res.status(201).json({
            message: `Layout updated successfully.`,
            stats: {
                kept: seatIdsToKeep.size,
                created: seatsToCreate.length,
                removed: removedCount,
                updated: updatedCount,
                skippedDeletion: seatsToRemove.length - removedCount
            }
        });
    } catch (error) {
        console.error('Error generating seats:', error);
        res.status(500).json({ message: 'Error generating seats', error });
    }
};

export const getScreenTiers = async (req: Request, res: Response): Promise<void> => {
    console.log(`GET /api/admin/screens/${req.params.screenId}/tiers called`);
    try {
        const { screenId } = req.params;
        const parsedId = parseInt(String(screenId));

        if (isNaN(parsedId)) {
            res.status(400).json({ message: 'Invalid screenId' });
            return;
        }

        const seats = await Seat.findAll({
            where: { screenId: parsedId },
            attributes: [
                [Sequelize.fn('DISTINCT', Sequelize.col('type')), 'tierName'],
            ],
            raw: true
        });

        const tiers = (seats as any[]).map(s => s.tierName).filter(Boolean);
        console.log(`Found tiers for screen ${parsedId}:`, tiers);
        res.json(tiers);
    } catch (error) {
        console.error('Error in getScreenTiers:', error);
        res.status(500).json({ message: 'Error fetching tiers', error });
    }
};

export const getSeatsByScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { screenId } = req.params;
        const seats = await Seat.findAll({ where: { screenId } });
        res.json(seats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching seats', error });
    }
};

export const getAllShowtimes = async (req: Request, res: Response): Promise<void> => {
    try {
        const showtimes = await Showtime.findAll({
            include: [
                { model: Movie },
                {
                    model: Screen,
                    include: [Theater]
                }
            ],
            order: [['startTime', 'ASC']]
        });
        res.json(showtimes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching showtimes', error });
    }
};

export const deleteShowtime = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const showtime = await Showtime.findByPk(parseInt(String(id)));

        if (!showtime) {
            res.status(404).json({ message: 'Showtime not found' });
            return;
        }

        // Manual cascade delete: delete associated bookings first
        await Booking.destroy({ where: { showtimeId: showtime.id } });

        await showtime.destroy();
        res.json({ message: 'Showtime deleted successfully' });
    } catch (error) {
        console.error('Error deleting showtime:', error);
        res.status(500).json({ message: 'Error deleting showtime', error });
    }
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
    try {
        const bookings = await Booking.findAll({
            include: [
                { model: User, attributes: ['id', 'name', 'email'] },
                {
                    model: Showtime,
                    include: [
                        { model: Movie, attributes: ['title'] },
                        { model: Screen, attributes: ['name'], include: [{ model: Theater, attributes: ['name'] }] }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings', error });
    }
};

export const deleteBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const booking = await Booking.findByPk(parseInt(String(id)));

        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }

        // Delete associated tickets first
        await Ticket.destroy({ where: { bookingId: booking.id } });

        // Fetch details for notification before deleting booking
        const { Notification } = require('../models/Notification');
        const showtime = await Showtime.findByPk(booking.showtimeId, { include: [Movie] });

        // Only notify if it's a future booking
        if (showtime && new Date(showtime.startTime) > new Date()) {
            await Notification.create({
                userId: booking.userId,
                title: 'Booking Cancelled',
                message: `Your booking for ${showtime.movie?.title || 'a movie'} has been cancelled by the administrator. A refund (if applicable) will be processed.`,
                type: 'warning',
                isRead: false
            });
        }

        await booking.destroy();
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ message: 'Error deleting booking', error });
    }
};
