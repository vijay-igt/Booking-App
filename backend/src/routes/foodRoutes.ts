import { Router } from 'express';
import { getFoodItems, createFoodItem, seedFoodItems } from '../controllers/foodController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/food:
 *   get:
 *     tags:
 *       - Food
 *     summary: Get all food items
 *     parameters:
 *       - name: theaterId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional theater ID to filter food items
 *     responses:
 *       200:
 *         description: List of food items retrieved successfully
 */
router.get('/', getFoodItems);

/**
 * @openapi
 * /api/food:
 *   post:
 *     tags:
 *       - Food
 *     summary: Create a new food item
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               isVeg:
 *                 type: boolean
 *               calories:
 *                 type: integer
 *               allergens:
 *                 type: string
 *               theaterId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Food item created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, createFoodItem);
/**
 * @openapi
 * /api/food/seed:
 *   post:
 *     tags:
 *       - Food
 *     summary: Seed default food items
 *     responses:
 *       200:
 *         description: Seeding successful
 */
router.post('/seed', seedFoodItems);

export default router;
