import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Movie } from '../models/Movie';
import { Showtime } from '../models/Showtime';
import { Screen } from '../models/Screen';
import { Theater } from '../models/Theater';
import { Booking } from '../models/Booking';
import { getProducer } from '../config/kafkaClient';

export const createMovie = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, genre, duration, rating, posterUrl, bannerUrl, releaseDate, language, audio, format } = req.body;
        const userId = req.user?.id;

        if (duration <= 0) {
            res.status(400).json({ message: 'Duration must be greater than 0 minutes.' });
            return;
        }

        // Standardize releaseDate
        const formattedDate = releaseDate === '' ? null : releaseDate;

        const movie = await Movie.create({
            title,
            description,
            genre,
            duration,
            rating,
            posterUrl,
            bannerUrl,
            releaseDate: formattedDate,
            language,
            audio,
            format,
            ownerId: userId || null // Set ownerId if user is logged in
        });
        res.status(201).json(movie);
    } catch (error) {
        res.status(500).json({ message: 'Error creating movie', error });
    }
};

export const getMovies = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        const { ownerId } = req.query;
        let whereClause: any = {};

        if (ownerId === 'me' && user) {
            whereClause.ownerId = user.id;
        } else if (ownerId) {
            // Optional: Allow filtering by specific owner ID (if needed for public profile)
            whereClause.ownerId = ownerId;
        }

        const movies = await Movie.findAll({ where: whereClause });
        res.json(movies);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching movies', error });
    }
};

export const getMovieById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const movie = await Movie.findByPk(id, {
            include: [{
                model: Showtime,
                required: false, // Include movie even if no future showtimes
                where: {
                    startTime: { [Op.gte]: new Date() }
                },
                include: [{
                    model: Screen,
                    include: [Theater]
                }]
            }]
        });
        if (!movie) {
            res.status(404).json({ message: 'Movie not found' });
            return;
        }

        // Produce movie view event
        try {
            const userId = req.user?.id;
            const producer = await getProducer();
            if (producer) {
                await producer.send({
                    topic: 'user-activity',
                    messages: [{
                        value: JSON.stringify({
                            userId,
                            movieId: id,
                            title: movie.title,
                            type: 'MOVIE_VIEW',
                            timestamp: new Date().toISOString()
                        })
                    }]
                });
            }
        } catch (eventError) {
            console.error('Failed to publish movie view event:', eventError);
        }

        res.json(movie);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching movie', error });
    }
};

export const updateMovie = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const { title, description, genre, duration, rating, posterUrl, bannerUrl, releaseDate, language, audio, format } = req.body;
        const user = req.user!;

        const movie = await Movie.findByPk(id);

        if (!movie) {
            res.status(404).json({ message: 'Movie not found' });
            return;
        }

        // Ownership Check
        if (user.role !== 'super_admin' && movie.ownerId !== user.id) {
            res.status(403).json({ message: 'Access denied. You do not own this movie.' });
            return;
        }

        // Standardize releaseDate
        const formattedDate = releaseDate === '' ? null : releaseDate;

        if (duration <= 0) {
            res.status(400).json({ message: 'Duration must be greater than 0 minutes.' });
            return;
        }

        await movie.update({ title, description, genre, duration, rating, posterUrl, bannerUrl, releaseDate: formattedDate, language, audio, format });
        res.json(movie);
    } catch (error) {
        console.error('Update Movie Error:', error);
        res.status(500).json({ message: 'Error updating movie', error });
    }
};

export const deleteMovie = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const user = req.user!;

        const movie = await Movie.findByPk(id, {
            include: [{
                model: Showtime,
                include: [Booking]
            }]
        });

        if (!movie) {
            res.status(404).json({ message: 'Movie not found' });
            return;
        }

        // Ownership Check
        if (user.role !== 'super_admin' && movie.ownerId !== user.id) {
            res.status(403).json({ message: 'Access denied. You do not own this movie.' });
            return;
        }

        // Safety check: Check if any showtime has active bookings
        const hasBookings = movie.showtimes?.some(st => st.bookings && st.bookings.length > 0);

        if (hasBookings) {
            res.status(400).json({
                message: 'Cannot delete movie because it has active bookings. Please cancel bookings first.'
            });
            return;
        }

        // If no bookings, we can safely delete associated showtimes and the movie
        // Sequelize will handle cascading if configured, but let's be explicit if needed
        // For this implementation, we assume we want to delete all associated showtimes
        if (movie.showtimes && movie.showtimes.length > 0) {
            await Showtime.destroy({ where: { movieId: id } });
        }

        await movie.destroy();
        res.json({ message: 'Movie and associated showtimes deleted successfully.' });
    } catch (error) {
        console.error('Delete Movie Error:', error);
        res.status(500).json({ message: 'Error deleting movie', error });
    }
};

// ─── Popularity Calculation ────────────────────────────────────────────────────

export const recalculatePopularity = async (req: Request, res: Response): Promise<void> => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Get booking counts per movie for the last 7 days
        // We need to join Booking -> Showtime -> Movie
        // Note: We use a raw query-like structure with Sequelize for aggregation
        const bookings = await Booking.findAll({
            where: {
                createdAt: { [Op.gte]: sevenDaysAgo },
                status: 'confirmed'
            },
            include: [{
                model: Showtime,
                attributes: ['movieId'],
                required: true
            }],
            attributes: [
                [sequelize.col('showtime.movieId'), 'movieId'],
                [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'count']
            ],
            group: ['showtime.movieId'],
            raw: true
        }) as unknown as { movieId: number; count: number }[];

        if (bookings.length === 0) {
            // Reset all to default 50 if no bookings? Or leave as is?
            // Let's leave as is to avoid wiping manual overrides, or maybe decay them?
            // For now, just return.
            res.json({ message: 'No recent bookings to calculate popularity from.' });
            return;
        }

        // 2. Find max bookings to normalize scores
        const maxBookings = Math.max(...bookings.map(b => Number(b.count)));

        // 3. Update each movie
        const updates = bookings.map(async (b) => {
            const movieId = b.movieId;
            const count = Number(b.count);
            // Linear scale: (count / max) * 100
            // We ensure at least 10 score if they have bookings, to distinguish from 0
            const score = Math.max(10, Math.round((count / maxBookings) * 100));

            await Movie.update({ popularityScore: score }, { where: { id: movieId } });
        });

        await Promise.all(updates);

        res.json({
            message: 'Popularity scores updated successfully.',
            stats: {
                moviesUpdated: bookings.length,
                maxBookingsInPeriod: maxBookings
            }
        });
    } catch (error) {
        console.error('Popularity Calc Error:', error);
        res.status(500).json({ message: 'Error calculating popularity', error });
    }
};
