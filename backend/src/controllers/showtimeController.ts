import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { Screen } from '../models/Screen';
import { Seat } from '../models/Seat';
import { Ticket } from '../models/Ticket';
import { Booking } from '../models/Booking';

export const createShowtime = async (req: Request, res: Response): Promise<void> => {
    try {
        const { movieId, screenId, startTime, endTime, price } = req.body;

        console.log('Creating showtime:', { movieId, screenId, startTime, endTime, price });

        // Convert to Date objects for proper comparison
        const newStart = new Date(startTime);
        const newEnd = new Date(endTime);

        // Check for overlaps - a showtime overlaps if:
        // - It starts before the new one ends AND
        // - It ends after the new one starts
        const conflictingShowtime = await Showtime.findOne({
            where: {
                screenId,
                [Op.or]: [
                    // New showtime starts during existing showtime
                    {
                        [Op.and]: [
                            { startTime: { [Op.lte]: newStart } },
                            { endTime: { [Op.gt]: newStart } }
                        ]
                    },
                    // New showtime ends during existing showtime
                    {
                        [Op.and]: [
                            { startTime: { [Op.lt]: newEnd } },
                            { endTime: { [Op.gte]: newEnd } }
                        ]
                    },
                    // New showtime completely contains existing showtime
                    {
                        [Op.and]: [
                            { startTime: { [Op.gte]: newStart } },
                            { endTime: { [Op.lte]: newEnd } }
                        ]
                    }
                ]
            },
            include: [Movie]
        });

        if (conflictingShowtime) {
            const conflictMovie = conflictingShowtime.movie as Movie;
            console.log('Conflict detected:', {
                existing: {
                    movie: conflictMovie?.title,
                    start: conflictingShowtime.startTime,
                    end: conflictingShowtime.endTime
                },
                new: { start: newStart, end: newEnd }
            });
            res.status(400).json({
                message: `Showtime conflicts with "${conflictMovie?.title}" scheduled from ${new Date(conflictingShowtime.startTime).toLocaleTimeString()} to ${new Date(conflictingShowtime.endTime).toLocaleTimeString()} on this screen.`
            });
            return;
        }

        const showtime = await Showtime.create({ movieId, screenId, startTime, endTime, price });
        console.log('Showtime created successfully:', showtime.id);
        res.status(201).json(showtime);
    } catch (error) {
        console.error('Error creating showtime:', error);
        res.status(500).json({ message: 'Error creating showtime', error });
    }
};

export const getShowtimesByScreen = async (req: Request, res: Response): Promise<void> => {
    try {
        const { screenId } = req.params;
        const showtimes = await Showtime.findAll({
            where: { screenId },
            include: [Movie],
        });
        res.json(showtimes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching showtimes', error });
    }
};

export const getShowtimesByMovie = async (req: Request, res: Response): Promise<void> => {
    try {
        const { movieId } = req.params;
        const showtimes = await Showtime.findAll({
            where: { movieId },
            include: [Screen],
        });
        res.json(showtimes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching showtimes', error });
    }
};

export const getShowtimeSeats = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const showtime = await Showtime.findByPk(id);
        if (!showtime) {
            res.status(404).json({ message: 'Showtime not found' });
            return;
        }

        const physicalSeats = await Seat.findAll({
            where: { screenId: showtime.screenId },
        });

        const bookedTickets = await Ticket.findAll({
            include: [{
                model: Booking,
                where: { showtimeId: id, status: 'confirmed' }
            }]
        });

        const bookedSeatIds = bookedTickets.map(t => t.seatId);

        const seatsWithStatus = physicalSeats.map(seat => ({
            id: seat.id,
            row: seat.row,
            number: seat.number,
            type: seat.type,
            price: showtime.price,
            status: bookedSeatIds.includes(seat.id) ? 'booked' : 'available',
        }));

        res.json(seatsWithStatus);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching seats for showtime', error });
    }
};

export const updateShowtime = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const { movieId, screenId, startTime, endTime, price } = req.body;

        const showtime = await Showtime.findByPk(id);
        if (!showtime) {
            res.status(404).json({ message: 'Showtime not found' });
            return;
        }

        // Check for overlaps if time or screen changed
        if (startTime || endTime || screenId) {
            const targetScreenId = screenId || showtime.screenId;
            const targetStart = new Date(startTime || showtime.startTime);
            const targetEnd = new Date(endTime || showtime.endTime);

            const conflictingShowtime = await Showtime.findOne({
                where: {
                    screenId: targetScreenId,
                    id: { [Op.ne]: id }, // Exclude self
                    [Op.or]: [
                        // Updated showtime starts during existing showtime
                        {
                            [Op.and]: [
                                { startTime: { [Op.lte]: targetStart } },
                                { endTime: { [Op.gt]: targetStart } }
                            ]
                        },
                        // Updated showtime ends during existing showtime
                        {
                            [Op.and]: [
                                { startTime: { [Op.lt]: targetEnd } },
                                { endTime: { [Op.gte]: targetEnd } }
                            ]
                        },
                        // Updated showtime completely contains existing showtime
                        {
                            [Op.and]: [
                                { startTime: { [Op.gte]: targetStart } },
                                { endTime: { [Op.lte]: targetEnd } }
                            ]
                        }
                    ]
                },
                include: [Movie]
            });

            if (conflictingShowtime) {
                const conflictMovie = conflictingShowtime.movie as Movie;
                res.status(400).json({
                    message: `Showtime conflicts with "${conflictMovie?.title}" scheduled from ${new Date(conflictingShowtime.startTime).toLocaleTimeString()} to ${new Date(conflictingShowtime.endTime).toLocaleTimeString()} on this screen.`
                });
                return;
            }
        }

        await showtime.update({ movieId, screenId, startTime, endTime, price });
        res.json(showtime);
    } catch (error) {
        console.error('Error updating showtime:', error);
        res.status(500).json({ message: 'Error updating showtime', error });
    }
};

export const deleteShowtime = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const showtime = await Showtime.findByPk(id);

        if (!showtime) {
            res.status(404).json({ message: 'Showtime not found' });
            return;
        }

        await showtime.destroy();
        res.json({ message: 'Showtime deleted successfully' });
    } catch (error) {
        console.error('Error deleting showtime:', error);
        res.status(500).json({ message: 'Error deleting showtime', error });
    }
};
