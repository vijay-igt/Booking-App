import { Router } from 'express';
import { createMovie, getMovies, getMovieById, updateMovie, deleteMovie } from '../controllers/movieController';
import { createShowtime, getShowtimesByMovie, getShowtimesByScreen, getShowtimeSeats, updateShowtime, deleteShowtime } from '../controllers/showtimeController';
import { adminAuth, optionalAuth, superAdminAuth } from '../middleware/auth';

const router = Router();

// Movie routes
router.post('/movies', superAdminAuth, createMovie);
router.get('/movies', optionalAuth, getMovies); // optionalAuth for "me" filter
router.get('/movies/:id', optionalAuth, getMovieById); // optionalAuth for view tracking
router.put('/movies/:id', superAdminAuth, updateMovie);
router.delete('/movies/:id', superAdminAuth, deleteMovie);

// Showtime routes
router.post('/showtimes', adminAuth, createShowtime);
router.put('/showtimes/:id', adminAuth, updateShowtime);
router.delete('/showtimes/:id', adminAuth, deleteShowtime);
router.get('/showtimes/movie/:movieId', getShowtimesByMovie);
router.get('/showtimes/screen/:screenId', getShowtimesByScreen);
router.get('/showtimes/:id/seats', getShowtimeSeats);

export default router;
