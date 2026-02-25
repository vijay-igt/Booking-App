import { Router } from 'express';
import {
    getQuote,
    listRules, createRule, updateRule, deleteRule,
    listCoupons, createCoupon, updateCoupon, deleteCoupon,
} from '../controllers/pricingController';
import { optionalAuth, adminAuth, superAdminAuth } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/pricing/quote:
 *   get:
 *     tags:
 *       - Pricing
 *     summary: Get a pricing quote for selected seats and food
 *     parameters:
 *       - name: showtimeId
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *       - name: seatIds
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated seat IDs
 *       - name: couponCode
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pricing quote retrieved successfully
 */
router.get('/quote', optionalAuth, getQuote);

// ── Pricing Rules — Super Admin only ─────────────────────────────────────────
/**
 * @openapi
 * /api/pricing/rules:
 *   get:
 *     tags:
 *       - Pricing
 *     summary: List all pricing rules (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pricing rules retrieved successfully
 *   post:
 *     tags:
 *       - Pricing
 *     summary: Create a new pricing rule
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
 *               - type
 *               - value
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               value:
 *                 type: number
 *               conditions:
 *                 type: object
 *                 properties:
 *                   movieId: { type: integer }
 *                   showtimeId: { type: integer }
 *                   seatCategory: { type: string }
 *                   paymentMethod: { type: string }
 *                   minOccupancy: { type: number }
 *     responses:
 *       201:
 *         description: Rule created
 *   put:
 *     tags:
 *       - Pricing
 *     summary: Update a pricing rule
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Rule updated
 */
router.get('/rules', superAdminAuth, listRules);
router.post('/rules', superAdminAuth, createRule);
router.put('/rules/:id', superAdminAuth, updateRule);
router.delete('/rules/:id', superAdminAuth, deleteRule);

// ── Coupons — Admin (own scope) or Super Admin ────────────────────────────────
/**
 * @openapi
 * /api/pricing/coupons:
 *   get:
 *     tags:
 *       - Pricing
 *     summary: List all coupons (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of coupons retrieved successfully
 *   post:
 *     tags:
 *       - Pricing
 *     summary: Create a new coupon
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - discountValue
 *             properties:
 *               code:
 *                 type: string
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               discountValue:
 *                 type: number
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               movieId: { type: integer }
 *               showtimeId: { type: integer }
 *               seatCategory: { type: string }
 *               paymentMethod: { type: string }
 *               usageLimit:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Coupon created
 *   put:
 *     tags:
 *       - Pricing
 *     summary: Update a coupon
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Coupon updated
 */
router.get('/coupons', adminAuth, listCoupons);
router.post('/coupons', adminAuth, createCoupon);
router.put('/coupons/:id', adminAuth, updateCoupon);
router.delete('/coupons/:id', adminAuth, deleteCoupon);

export default router;
