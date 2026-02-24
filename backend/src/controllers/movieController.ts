import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Movie } from '../models/Movie';
import { Showtime } from '../models/Showtime';
import { Screen } from '../models/Screen';
import { Theater } from '../models/Theater';
import { Booking } from '../models/Booking';
import { Watchlist } from '../models/Watchlist';
import { getProducer } from '../config/kafkaClient';

export const createMovie = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, genre, duration, rating, posterUrl, bannerUrl, trailerUrl, releaseDate, language, audio, format } = req.body;
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
            trailerUrl,
            releaseDate: formattedDate,
            language,
            audio,
            format,
            ownerId: userId || null
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
        if (user) {
            const watchlistEntries = await Watchlist.findAll({
                where: { userId: user.id },
                attributes: ['movieId'],
            });
            const watchlistedIds = new Set(watchlistEntries.map(w => w.movieId));
            const moviesWithFlag = movies.map(m => ({
                ...m.toJSON(),
                isInWatchlist: watchlistedIds.has(m.id),
            }));
            res.json(moviesWithFlag);
            return;
        }
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
        const userId = req.user?.id;
        if (userId) {
            const watchlistEntry = await Watchlist.findOne({
                where: { userId, movieId: id },
            });
            const payload = {
                ...movie.toJSON(),
                isInWatchlist: !!watchlistEntry,
            };
            res.json(payload);
            return;
        }
        res.json(movie);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching movie', error });
    }
};

export const updateMovie = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const { title, description, genre, duration, rating, posterUrl, bannerUrl, trailerUrl, releaseDate, language, audio, format } = req.body;
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

        await movie.update({ title, description, genre, duration, rating, posterUrl, bannerUrl, trailerUrl, releaseDate: formattedDate, language, audio, format });
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

export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (userId) {
            const recentBookings = await Booking.findAll({
                where: {
                    userId,
                    status: 'confirmed'
                },
                include: [{
                    model: Showtime,
                    attributes: ['movieId'],
                    required: true
                }],
                order: [['createdAt', 'DESC']],
                limit: 20
            });

            const watchedMovieIds = Array.from(
                new Set(
                    recentBookings
                        .map(b => (b as any).showtime?.movieId)
                        .filter((id: number | undefined) => typeof id === 'number')
                )
            ) as number[];

            if (watchedMovieIds.length > 0) {
                const watchedMovies = await Movie.findAll({
                    where: { id: watchedMovieIds }
                });

                const genreCounts: Record<string, number> = {};
                watchedMovies.forEach(m => {
                    if (!m.genre) return;
                    m.genre.split(',').map(g => g.trim()).forEach(g => {
                        if (!g) return;
                        genreCounts[g] = (genreCounts[g] || 0) + 1;
                    });
                });

                const sortedGenres = Object.entries(genreCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([genre]) => genre);

                const topGenres = sortedGenres.slice(0, 3);

                const whereClause: any = {};
                if (topGenres.length > 0) {
                    whereClause.genre = {
                        [Op.or]: topGenres.map(g => ({ [Op.like]: `%${g}%` }))
                    };
                }
                if (watchedMovieIds.length > 0) {
                    whereClause.id = { [Op.notIn]: watchedMovieIds };
                }

                const personalizedMovies = await Movie.findAll({
                    where: whereClause,
                    order: [['popularityScore', 'DESC']],
                    limit: 12
                });

                if (personalizedMovies.length > 0) {
                    res.json(personalizedMovies);
                    return;
                }
            }
        }

        const fallbackMovies = await Movie.findAll({
            order: [['popularityScore', 'DESC']],
            limit: 12
        });
        res.json(fallbackMovies);
    } catch (error) {
        console.error('Get Recommendations Error:', error);
        res.status(500).json({ message: 'Error fetching recommendations', error });
    }
};

export const addToWatchlist = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const movieId = parseInt(req.params.id as string);
        const { location } = req.body as { location?: string };

        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const movie = await Movie.findByPk(movieId);
        if (!movie) {
            res.status(404).json({ message: 'Movie not found' });
            return;
        }

        const [entry] = await Watchlist.findOrCreate({
            where: { userId, movieId },
            defaults: { userId, movieId, location },
        });

        if (location && entry.location !== location) {
            entry.location = location;
            await entry.save();
        }

        res.status(201).json({ message: 'Added to watchlist' });
    } catch (error) {
        console.error('Add to Watchlist Error:', error);
        res.status(500).json({ message: 'Error adding to watchlist', error });
    }
};

export const removeFromWatchlist = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const movieId = parseInt(req.params.id as string);

        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        await Watchlist.destroy({
            where: { userId, movieId },
        });

        res.status(200).json({ message: 'Removed from watchlist' });
    } catch (error) {
        console.error('Remove from Watchlist Error:', error);
        res.status(500).json({ message: 'Error removing from watchlist', error });
    }
};

export const getWatchlist = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const entries = await Watchlist.findAll({
            where: { userId },
            include: [Movie],
            order: [['createdAt', 'DESC']],
        });

        const movies = entries
            .map(entry => (entry as any).movie)
            .filter((movie: Movie | undefined) => !!movie)
            .map((movie: Movie) => ({
                ...movie.toJSON(),
                isInWatchlist: true,
            }));

        res.json(movies);
    } catch (error) {
        console.error('Get Watchlist Error:', error);
        res.status(500).json({ message: 'Error fetching watchlist', error });
    }
};
