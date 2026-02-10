import express from 'express';
import { activities } from '../consumers/analyticsConsumer';
import { adminAuth } from '../middleware/auth';

const router = express.Router();

// GET /api/admin/analytics - Fetch recent activities (Admin only)
router.get('/', adminAuth, (req, res) => {
    res.json(activities);
});

export default router;
