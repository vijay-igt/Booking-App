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

        // Check for overlaps
        const conflictingShowtime = await Showtime.findOne({
            where: {
                screenId,
                [Op.and]: [
                    { startTime: { [Op.lt]: endTime } },
                    { endTime: { [Op.gt]: startTime } }
                ]
            }
        });

        if (conflictingShowtime) {
            res.status(400).json({ message: 'Showtime overlaps with an existing session on this screen.' });
            return;
        }

        const showtime = await Showtime.create({ movieId, screenId, startTime, endTime, price });
        res.status(201).json(showtime);
    } catch (error) {
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
            const targetStart = startTime || showtime.startTime;
            const targetEnd = endTime || showtime.endTime;

            const conflictingShowtime = await Showtime.findOne({
                where: {
                    screenId: targetScreenId,
                    id: { [Op.ne]: id }, // Exclude self
                    [Op.and]: [
                        { startTime: { [Op.lt]: targetEnd } },
                        { endTime: { [Op.gt]: targetStart } }
                    ]
                }
            });

            if (conflictingShowtime) {
                res.status(400).json({ message: 'Showtime overlaps with an existing session on this screen.' });
                return;
            }
        }

        await showtime.update({ movieId, screenId, startTime, endTime, price });
        res.json(showtime);
    } catch (error) {
        res.status(500).json({ message: 'Error updating showtime', error });
    }
};
