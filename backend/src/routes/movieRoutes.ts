import { Router } from 'express';
import { createMovie, getMovies, getMovieById, updateMovie } from '../controllers/movieController';
import { createShowtime, getShowtimesByMovie, getShowtimesByScreen, getShowtimeSeats, updateShowtime, deleteShowtime } from '../controllers/showtimeController';

const router = Router();

// Movie routes
router.post('/movies', createMovie);
router.get('/movies', getMovies);
router.get('/movies/:id', getMovieById);
router.put('/movies/:id', updateMovie);

// Showtime routes
router.post('/showtimes', createShowtime);
router.put('/showtimes/:id', updateShowtime);
router.delete('/showtimes/:id', deleteShowtime);
router.get('/showtimes/movie/:movieId', getShowtimesByMovie);
router.get('/showtimes/screen/:screenId', getShowtimesByScreen);
router.get('/showtimes/:id/seats', getShowtimeSeats);

export default router;
