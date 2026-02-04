import { Request, Response } from 'express';
import { Movie } from '../models/Movie';
import { Showtime } from '../models/Showtime';
import { Screen } from '../models/Screen';
import { Theater } from '../models/Theater';

export const createMovie = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, genre, duration, rating, posterUrl, releaseDate, language, audio, format } = req.body;

        // Standardize releaseDate
        const formattedDate = releaseDate === '' ? null : releaseDate;

        const movie = await Movie.create({ title, description, genre, duration, rating, posterUrl, releaseDate: formattedDate, language, audio, format });
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
        const { title, description, genre, duration, rating, posterUrl, releaseDate, language, audio, format } = req.body;
        const movie = await Movie.findByPk(id);

        if (!movie) {
            res.status(404).json({ message: 'Movie not found' });
            return;
        }

        // Standardize releaseDate
        const formattedDate = releaseDate === '' ? null : releaseDate;

        await movie.update({ title, description, genre, duration, rating, posterUrl, releaseDate: formattedDate, language, audio, format });
        res.json(movie);
    } catch (error) {
        console.error('Update Movie Error:', error);
        res.status(500).json({ message: 'Error updating movie', error });
    }
};
