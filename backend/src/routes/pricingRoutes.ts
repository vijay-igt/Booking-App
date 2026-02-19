import { Router } from 'express';
import {
    getQuote,
    listRules, createRule, updateRule, deleteRule,
    listCoupons, createCoupon, updateCoupon, deleteCoupon,
} from '../controllers/pricingController';
import { optionalAuth, adminAuth, superAdminAuth } from '../middleware/auth';

const router = Router();

// ── Public quote endpoint (optional auth for membership discount) ─────────────
router.get('/quote', optionalAuth, getQuote);

// ── Pricing Rules — Super Admin only ─────────────────────────────────────────
router.get('/rules', superAdminAuth, listRules);
router.post('/rules', superAdminAuth, createRule);
router.put('/rules/:id', superAdminAuth, updateRule);
router.delete('/rules/:id', superAdminAuth, deleteRule);

// ── Coupons — Admin (own scope) or Super Admin ────────────────────────────────
router.get('/coupons', adminAuth, listCoupons);
router.post('/coupons', adminAuth, createCoupon);
router.put('/coupons/:id', adminAuth, updateCoupon);
router.delete('/coupons/:id', adminAuth, deleteCoupon);

export default router;
