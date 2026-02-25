import { Router } from 'express';
import { createMovie, getMovies, getMovieById, updateMovie, deleteMovie, recalculatePopularity, getRecommendations, addToWatchlist, removeFromWatchlist, getWatchlist } from '../controllers/movieController';
import { createShowtime, getShowtimesByMovie, getShowtimesByScreen, getShowtimeById, getShowtimeSeats, updateShowtime, deleteShowtime } from '../controllers/showtimeController';
import { adminAuth, optionalAuth, superAdminAuth, authenticateToken } from '../middleware/auth';

const router = Router();

// Movie routes
/**
 * @openapi
 * /api/movies:
 *   get:
 *     tags:
 *       - Movies
 *     summary: Get all movies
 *     parameters:
 *       - name: ownerId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by owner ID (use 'me' for current admin's movies)
 *     responses:
 *       200:
 *         description: List of movies retrieved successfully
 */
router.get('/movies', optionalAuth, getMovies);

/**
 * @openapi
 * /api/movies/recommendations:
 *   get:
 *     tags:
 *       - Movies
 *     summary: Get movie recommendations
 *     responses:
 *       200:
 *         description: Recommendations retrieved
 */
router.get('/movies/recommendations', optionalAuth, getRecommendations);

/**
 * @openapi
 * /api/movies/watchlist:
 *   get:
 *     tags:
 *       - Movies
 *     summary: Get user watchlist
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watchlist retrieved
 */
router.get('/movies/watchlist', authenticateToken, getWatchlist);

/**
 * @openapi
 * /api/movies/{id}/watchlist:
 *   post:
 *     tags:
 *       - Movies
 *     summary: Add movie to watchlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Added to watchlist
 */
router.post('/movies/:id/watchlist', authenticateToken, addToWatchlist);
router.delete('/movies/:id/watchlist', authenticateToken, removeFromWatchlist);

/**
 * @openapi
 * /api/movies/{id}:
 *   get:
 *     tags:
 *       - Movies
 *     summary: Get movie by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Movie retrieved successfully
 *       404:
 *         description: Movie not found
 */
router.get('/movies/:id', optionalAuth, getMovieById);
router.put('/movies/:id', superAdminAuth, updateMovie);
router.delete('/movies/:id', superAdminAuth, deleteMovie);

// Showtime routes
router.post('/showtimes', adminAuth, createShowtime);
router.put('/showtimes/:id', adminAuth, updateShowtime);
router.delete('/showtimes/:id', adminAuth, deleteShowtime);

/**
 * @openapi
 * /api/showtimes/movie/{movieId}:
 *   get:
 *     tags:
 *       - Showtimes
 *     summary: Get showtimes for a specific movie
 *     parameters:
 *       - name: movieId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Showtimes retrieved successfully
 */
router.get('/showtimes/movie/:movieId', getShowtimesByMovie);

/**
 * @openapi
 * /api/showtimes/screen/{screenId}:
 *   get:
 *     tags:
 *       - Showtimes
 *     summary: Get showtimes for a specific screen
 *     parameters:
 *       - name: screenId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Showtimes retrieved
 */
router.get('/showtimes/screen/:screenId', getShowtimesByScreen);

/**
 * @openapi
 * /api/showtimes/{id}:
 *   get:
 *     tags:
 *       - Showtimes
 *     summary: Get showtime details by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Showtime details retrieved
 *       404:
 *         description: Showtime not found
 */
router.get('/showtimes/:id', getShowtimeById);

/**
 * @openapi
 * /api/showtimes/{id}/seats:
 *   get:
 *     tags:
 *       - Showtimes
 *     summary: Get seats and availability for a showtime
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Seat map retrieved successfully
 */
router.get('/showtimes/:id/seats', getShowtimeSeats);
export default router;
