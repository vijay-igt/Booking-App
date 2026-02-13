import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { Screen } from '../models/Screen';
import { Seat } from '../models/Seat';
import { Ticket } from '../models/Ticket';
import { Booking } from '../models/Booking';
import { Theater } from '../models/Theater';

export const createShowtime = async (req: Request, res: Response): Promise<void> => {
    try {
        const { movieId, screenId, startTime, endTime, tierPrices } = req.body;
        const user = req.user!;

        // Ownership Check
        const screen = await Screen.findByPk(screenId, {
            include: [Theater]
        });

        if (!screen) {
            res.status(404).json({ message: 'Screen not found.' });
            return;
        }

        if (user.role !== 'super_admin' && screen.theater?.ownerId !== user.id) {
            res.status(403).json({ message: 'Access denied. You do not own this screen.' });
            return;
        }

        if (!tierPrices || Object.keys(tierPrices).length === 0) {
            res.status(400).json({ message: 'At least one tier price must be configured.' });
            return;
        }

        // Validate prices prevent negative values
        for (const [tier, price] of Object.entries(tierPrices)) {
            if (Number(price) < 0) {
                res.status(400).json({ message: `Price for tier "${tier}" cannot be negative.` });
                return;
            }
        }

        console.log('Creating showtime:', { movieId, screenId, startTime, endTime });

        // Convert to Date objects for proper comparison
        const newStart = new Date(startTime);
        const newEnd = new Date(endTime);

        // Fetch movie to check release date
        const movie = await Movie.findByPk(movieId);
        if (!movie) {
            res.status(404).json({ message: 'Movie not found.' });
            return;
        }

        if (movie.releaseDate) {
            const releaseDate = new Date(movie.releaseDate);
            // Compare only dates (ignoring time) or full timestamp? 
            // Usually, movies release at 00:00 of the release date.
            if (newStart < releaseDate) {
                res.status(400).json({
                    message: `Showtime cannot be scheduled before the movie release date (${movie.releaseDate}).`
                });
                return;
            }
        }

        // Check if start time is in the past
        if (newStart < new Date()) {
            res.status(400).json({ message: 'Cannot schedule showtime in the past.' });
            return;
        }

        if (newEnd <= newStart) {
            res.status(400).json({ message: 'End time must be after start time.' });
            return;
        }

        // Check for overlaps using the standard formula: (StartA < EndB) && (EndA > StartB)
        const conflictingShowtime = await Showtime.findOne({
            where: {
                screenId: parseInt(String(screenId)), // Ensure integer comparison
                [Op.and]: [
                    { startTime: { [Op.lt]: newEnd } },
                    { endTime: { [Op.gt]: newStart } }
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
                message: `Showtime conflicts with "${conflictMovie?.title}" scheduled from ${new Date(conflictingShowtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} to ${new Date(conflictingShowtime.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} (UTC) on this screen.`,
                conflict: {
                    movieTitle: conflictMovie?.title,
                    startTime: conflictingShowtime.startTime,
                    endTime: conflictingShowtime.endTime
                }
            });
            return;
        }

        const showtime = await Showtime.create({ movieId, screenId, startTime, endTime, tierPrices });
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
            where: {
                movieId,
                startTime: { [Op.gte]: new Date() } // Only show future showtimes
            },
            include: [Screen],
            order: [['startTime', 'ASC']]
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

        const seatsWithStatus = physicalSeats.map(seat => {
            let finalPrice = 0;
            if (showtime.tierPrices && showtime.tierPrices[seat.type]) {
                finalPrice = showtime.tierPrices[seat.type];
            } else if (showtime.tierPrices) {
                // Fallback to first available tier price if specific mapping missing
                const firstTier = Object.keys(showtime.tierPrices)[0];
                finalPrice = showtime.tierPrices[firstTier] || 0;
            }

            return {
                id: seat.id,
                row: seat.row,
                number: seat.number,
                type: seat.type,
                price: finalPrice,
                status: bookedSeatIds.includes(seat.id) ? 'booked' : 'available',
            };
        });

        res.json(seatsWithStatus);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching seats for showtime', error });
    }
};

export const updateShowtime = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const { movieId, screenId, startTime, endTime, tierPrices } = req.body;
        const user = req.user!;

        const showtime = await Showtime.findByPk(id, {
            include: [{ model: Screen, include: [Theater] }]
        });
        if (!showtime) {
            res.status(404).json({ message: 'Showtime not found' });
            return;
        }

        // Ownership Check
        if (user.role !== 'super_admin') {
            const ownerId = showtime.screen?.theater?.ownerId;
            if (ownerId !== user.id) {
                res.status(403).json({ message: 'Access denied.' });
                return;
            }

            // If changing screenId, check new screen ownership too
            if (screenId && parseInt(screenId) !== showtime.screenId) {
                const newScreen = await Screen.findByPk(screenId, { include: [Theater] });
                if (!newScreen || newScreen.theater?.ownerId !== user.id) {
                    res.status(403).json({ message: 'Access denied. You do not own the target screen.' });
                    return;
                }
            }
        }

        // Check for overlaps if time or screen changed
        if (startTime || endTime || screenId) {
            const targetScreenId = screenId ? parseInt(String(screenId)) : showtime.screenId;
            const targetStart = startTime ? new Date(startTime) : new Date(showtime.startTime);
            const targetEnd = endTime ? new Date(endTime) : new Date(showtime.endTime);

            // Check if start time is in the past
            if (targetStart < new Date()) {
                res.status(400).json({ message: 'Cannot reschedule showtime to the past.' });
                return;
            }

            // Check against movie release date
            const movie = await Movie.findByPk(movieId || showtime.movieId);
            if (movie && movie.releaseDate) {
                const releaseDate = new Date(movie.releaseDate);
                if (targetStart < releaseDate) {
                    res.status(400).json({
                        message: `Showtime cannot be scheduled before the movie release date (${movie.releaseDate}).`
                    });
                    return;
                }
            }

            if (targetEnd <= targetStart) {
                res.status(400).json({ message: 'End time must be after start time.' });
                return;
            }

            const conflictingShowtime = await Showtime.findOne({
                where: {
                    screenId: targetScreenId,
                    id: { [Op.ne]: id }, // Exclude self
                    [Op.and]: [
                        { startTime: { [Op.lt]: targetEnd } },
                        { endTime: { [Op.gt]: targetStart } }
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

        await showtime.update({ movieId, screenId, startTime, endTime, tierPrices });
        res.json(showtime);
    } catch (error) {
        console.error('Error updating showtime:', error);
        res.status(500).json({ message: 'Error updating showtime', error });
    }
};

export const deleteShowtime = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const user = req.user!;

        const showtime = await Showtime.findByPk(id, {
            include: [{ model: Screen, include: [Theater] }]
        });

        if (!showtime) {
            res.status(404).json({ message: 'Showtime not found' });
            return;
        }

        // Ownership Check
        if (user.role !== 'super_admin') {
            const ownerId = showtime.screen?.theater?.ownerId;
            if (ownerId !== user.id) {
                res.status(403).json({ message: 'Access denied.' });
                return;
            }
        }

        // Manual cascade delete: delete associated tickets and bookings
        await Ticket.destroy({ where: { showtimeId: id } });
        await Booking.destroy({ where: { showtimeId: id } });

        await showtime.destroy();
        res.json({ message: 'Showtime deleted successfully' });
    } catch (error) {
        console.error('Error deleting showtime:', error);
        res.status(500).json({ message: 'Error deleting showtime', error });
    }
};
