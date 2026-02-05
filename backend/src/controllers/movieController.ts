import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Movie } from '../models/Movie';
import { Showtime } from '../models/Showtime';
import { Screen } from '../models/Screen';
import { Theater } from '../models/Theater';
import { Booking } from '../models/Booking';

export const createMovie = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, genre, duration, rating, posterUrl, bannerUrl, releaseDate, language, audio, format } = req.body;

        // Standardize releaseDate
        const formattedDate = releaseDate === '' ? null : releaseDate;

        const movie = await Movie.create({ title, description, genre, duration, rating, posterUrl, bannerUrl, releaseDate: formattedDate, language, audio, format });
        res.status(201).json(movie);
    } catch (error) {
        res.status(500).json({ message: 'Error creating movie', error });
    }
};

export const getMovies = async (req: Request, res: Response): Promise<void> => {
    try {
        const movies = await Movie.findAll();
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
        res.json(movie);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching movie', error });
    }
};

export const updateMovie = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string);
        const { title, description, genre, duration, rating, posterUrl, bannerUrl, releaseDate, language, audio, format } = req.body;
        const movie = await Movie.findByPk(id);

        if (!movie) {
            res.status(404).json({ message: 'Movie not found' });
            return;
        }

        // Standardize releaseDate
        const formattedDate = releaseDate === '' ? null : releaseDate;

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
