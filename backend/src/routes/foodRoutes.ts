import { Router } from 'express';
import { getFoodItems, createFoodItem, seedFoodItems } from '../controllers/foodController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getFoodItems);
router.post('/', authenticateToken, createFoodItem);
router.post('/seed', seedFoodItems);

export default router;
