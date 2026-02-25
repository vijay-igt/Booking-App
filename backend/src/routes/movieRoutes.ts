import { Router } from 'express';
import { createMovie, getMovies, getMovieById, updateMovie, deleteMovie, recalculatePopularity, getRecommendations, addToWatchlist, removeFromWatchlist, getWatchlist } from '../controllers/movieController';
import { createShowtime, getShowtimesByMovie, getShowtimesByScreen, getShowtimeById, getShowtimeSeats, updateShowtime, deleteShowtime } from '../controllers/showtimeController';
import { adminAuth, optionalAuth, superAdminAuth, authenticateToken } from '../middleware/auth';

const router = Router();

// Movie routes
router.post('/movies', superAdminAuth, createMovie);
router.post('/movies/popularity/recalculate', superAdminAuth, recalculatePopularity);
router.get('/movies', optionalAuth, getMovies);
router.get('/movies/recommendations', optionalAuth, getRecommendations);
router.get('/movies/watchlist', authenticateToken, getWatchlist);
router.post('/movies/:id/watchlist', authenticateToken, addToWatchlist);
router.delete('/movies/:id/watchlist', authenticateToken, removeFromWatchlist);
router.get('/movies/:id', optionalAuth, getMovieById);
router.put('/movies/:id', superAdminAuth, updateMovie);
router.delete('/movies/:id', superAdminAuth, deleteMovie);

// Showtime routes
router.post('/showtimes', adminAuth, createShowtime);
router.put('/showtimes/:id', adminAuth, updateShowtime);
router.delete('/showtimes/:id', adminAuth, deleteShowtime);
router.get('/showtimes/movie/:movieId', getShowtimesByMovie);
router.get('/showtimes/screen/:screenId', getShowtimesByScreen);
router.get('/showtimes/:id', getShowtimeById);
router.get('/showtimes/:id/seats', getShowtimeSeats);
export default router;
