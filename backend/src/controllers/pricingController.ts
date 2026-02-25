import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { PricingRule } from '../models/PricingRule';
import { Coupon } from '../models/Coupon';
import { Showtime } from '../models/Showtime';
import { Movie } from '../models/Movie';
import { Screen } from '../models/Screen';
import { Seat } from '../models/Seat';
import { Ticket } from '../models/Ticket';
import { Booking } from '../models/Booking';
import { User } from '../models/User';
import { Theater } from '../models/Theater';
import { CouponUsage } from '../models/CouponUsage';
import { sequelize } from '../config/database';
import {
    calculateSeatPrice,
    validateCoupon,
    PricingContext,
} from '../services/pricingEngine';

// ─── In-process rule cache (60-second TTL per date) ───────────────────────────
const rulesCache: Record<string, { rules: PricingRule[]; expiry: number }> = {};

async function getActiveRules(targetDate: string): Promise<PricingRule[]> {
    const now = Date.now();
    const cacheEntry = rulesCache[targetDate];

    if (cacheEntry && now < cacheEntry.expiry) {
        return cacheEntry.rules;
    }

    const rules = await PricingRule.findAll({
        where: {
            isActive: true,
            [Op.and]: [
                {
                    [Op.or]: [
                        { validFrom: null },
                        { validFrom: { [Op.lte]: targetDate } },
                    ],
                },
                {
                    [Op.or]: [
                        { validUntil: null },
                        { validUntil: { [Op.gte]: targetDate } },
                    ],
                },
            ],
        },
        order: [['priority', 'ASC'], ['id', 'ASC']],
    });

    rulesCache[targetDate] = {
        rules,
        expiry: now + 60_000, // 60 seconds
    };

    return rules;
}

function invalidateRulesCache() {
    Object.keys(rulesCache).forEach(key => delete rulesCache[key]);
}

// ─── GET /api/pricing/quote ───────────────────────────────────────────────────
export const getQuote = async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    try {
        const { showtimeId, seatIds, couponCode, paymentMethod } = req.query;

        if (!showtimeId || !seatIds) {
            res.status(400).json({ message: 'showtimeId and seatIds are required.' });
            return;
        }

        const parsedSeatIds = String(seatIds).split(',').map(Number).filter(Boolean);
        if (parsedSeatIds.length === 0) {
            res.status(400).json({ message: 'At least one valid seatId is required.' });
            return;
        }

        // 1. Fetch Showtime + Movie + Screen
        const showtime = await Showtime.findByPk(Number(showtimeId), {
            include: [
                { model: Movie },
                { model: Screen, include: [Theater] as any },
            ] as any,
        });
        if (!showtime) {
            res.status(404).json({ message: 'Showtime not found.' });
            return;
        }

        // 2. Fetch Seats
        const seats = await Seat.findAll({
            where: { id: parsedSeatIds, screenId: showtime.screenId },
        });
        if (seats.length !== parsedSeatIds.length) {
            res.status(404).json({ message: 'One or more seats not found.' });
            return;
        }

        // 3. Count booked seats for occupancy calculation (single COUNT query)
        const bookedCount = await Ticket.count({
            include: [{
                model: Booking,
                where: { showtimeId: showtime.id, status: 'confirmed' },
                required: true,
            }] as any,
        });
        const totalSeats = await Seat.count({ where: { screenId: showtime.screenId } });
        const occupancyPercent = totalSeats > 0 ? (bookedCount / totalSeats) * 100 : 0;

        // 4. Fetch active rules for the showtime date
        const targetDate = new Date(showtime.startTime).toISOString().slice(0, 10);
        const rules = await getActiveRules(targetDate);

        // 5. Fetch user membership tier (optional)
        const authUserId = req.user?.id;
        let membershipTier: 'NONE' | 'SILVER' | 'GOLD' | 'PLATINUM' = 'NONE';
        if (authUserId) {
            const user = await User.findByPk(authUserId, { attributes: ['membershipTier'] });
            if (user) membershipTier = user.membershipTier;
        }

        // 6. Calculate per-seat prices
        const tierPrices = showtime.tierPrices || {};
        const perSeatBreakdowns = seats.map(seat => {
            const basePrice = Number(tierPrices[seat.type] ?? seat.price);
            const ctx: PricingContext = {
                showtimeDate: new Date(showtime.startTime),
                moviePopularityScore: showtime.movie?.popularityScore ?? 50,
                seatCategory: seat.type,
                occupancyPercent,
                occupancyThreshold: showtime.occupancyThreshold ?? 70,
                basePrice,
                membershipTier,
                paymentMethod: paymentMethod ? String(paymentMethod) : undefined,
            };
            return { seatId: seat.id, seatType: seat.type, ...calculateSeatPrice(ctx, rules) };
        });

        const totalBeforeCoupon = perSeatBreakdowns.reduce((sum, s) => sum + s.finalPrice, 0);

        // 7. Validate coupon (optional)
        let couponDiscountAmount = 0;
        let couponError: string | undefined;
        let couponDetails: any = null;

        if (couponCode) {
            const coupon = await Coupon.findOne({
                where: { code: String(couponCode).toUpperCase() },
                include: [{ model: User, as: 'creator' }],
            });

            if (!coupon) {
                couponError = 'Invalid coupon code.';
            } else {
                // Check if coupon is valid for this theater (Ownership scope)
                const showtimeAny = showtime as any;
                const theaterOwnerId = showtimeAny.screen?.theater?.ownerId;
                const isSuperAdminCoupon = coupon.creator?.role === 'super_admin';
                const isOwnerCoupon = theaterOwnerId && coupon.createdBy === theaterOwnerId;

                if (!isSuperAdminCoupon && !isOwnerCoupon) {
                    couponError = 'This coupon is not valid at this theater.';
                } else {
                    if (coupon.perUserLimit !== null && !authUserId) {
                        couponError = 'Please log in to use this coupon.';
                    } else {
                        const userUsageCount = authUserId
                            ? await CouponUsage.count({ where: { couponId: coupon.id, userId: authUserId } })
                            : 0;

                        const result = validateCoupon({
                            coupon,
                            totalBeforeCoupon,
                            userId: authUserId ?? 0,
                            userUsageCount,
                            movieId: showtime.movieId,
                            showtimeId: showtime.id,
                            showtimeDate: new Date(showtime.startTime),
                            seatCategories: seats.map(s => s.type),
                            paymentMethod: paymentMethod ? String(paymentMethod) : undefined,
                        });

                        if (!result.valid) {
                            couponError = result.reason;
                        } else {
                            couponDiscountAmount = result.discountAmount;
                            couponDetails = {
                                code: coupon.code,
                                discountType: coupon.discountType,
                                discountValue: coupon.discountValue,
                                discountAmount: couponDiscountAmount,
                            };
                        }
                    }
                }
            }
        }

        const totalAfterCoupon = Math.max(1, totalBeforeCoupon - couponDiscountAmount);
        const elapsed = Date.now() - start;

        res.json({
            showtimeId: showtime.id,
            movie: showtime.movie?.title,
            seats: perSeatBreakdowns,
            subtotal: Math.round(perSeatBreakdowns.reduce((sum, s) => sum + s.basePrice, 0) * 100) / 100,
            coupon: couponDetails,
            couponError,
            couponDiscount: couponDiscountAmount,
            total: Math.round(totalAfterCoupon * 100) / 100,
            membershipTier,
            calculationMs: elapsed,
        });
    } catch (error) {
        console.error('[PricingController] getQuote error:', error);
        res.status(500).json({ message: 'Error calculating price.' });
    }
};

// ─── PRICING RULES (Super Admin only) ────────────────────────────────────────

export const listRules = async (_req: Request, res: Response): Promise<void> => {
    try {
        const rules = await PricingRule.findAll({ order: [['priority', 'ASC'], ['id', 'ASC']] });
        res.json(rules);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pricing rules.' });
    }
};

export const createRule = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, ruleType, condition, multiplier, flatDiscount, priority, isActive, validFrom, validUntil } = req.body;

        if (!name || !ruleType) {
            res.status(400).json({ message: 'name and ruleType are required.' });
            return;
        }
        if (multiplier == null && flatDiscount == null) {
            res.status(400).json({ message: 'Either multiplier or flatDiscount must be provided.' });
            return;
        }

        const rule = await PricingRule.create({
            name, ruleType, condition: condition || {},
            multiplier: multiplier ?? null,
            flatDiscount: flatDiscount ?? null,
            priority: priority ?? 10,
            isActive: isActive !== false,
            validFrom: validFrom ?? null,
            validUntil: validUntil ?? null,
        });

        invalidateRulesCache();
        res.status(201).json(rule);
    } catch (error) {
        console.error('[PricingController] createRule error:', error);
        res.status(500).json({ message: 'Error creating pricing rule.' });
    }
};

export const updateRule = async (req: Request, res: Response): Promise<void> => {
    try {
        const rule = await PricingRule.findByPk(Number(req.params.id));
        if (!rule) { res.status(404).json({ message: 'Rule not found.' }); return; }

        await rule.update(req.body);
        invalidateRulesCache();
        res.json(rule);
    } catch (error) {
        res.status(500).json({ message: 'Error updating pricing rule.' });
    }
};

export const deleteRule = async (req: Request, res: Response): Promise<void> => {
    try {
        const rule = await PricingRule.findByPk(Number(req.params.id));
        if (!rule) { res.status(404).json({ message: 'Rule not found.' }); return; }

        await rule.destroy();
        invalidateRulesCache();
        res.json({ message: 'Rule deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting pricing rule.' });
    }
};

// ─── COUPONS (Admin or Super Admin) ──────────────────────────────────────────

export const listCoupons = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        const where: any = {};

        // Admins only see their own coupons
        if (user.role === 'admin') {
            where.createdBy = user.id;
        }

        const coupons = await Coupon.findAll({ where, order: [['createdAt', 'DESC']] });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching coupons.' });
    }
};

export const createCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        const {
            code, discountType, discountValue, maxUses, perUserLimit,
            minOrderValue, validFrom, expiresAt,
            movieId, showtimeId, seatCategory, paymentMethod, isActive,
        } = req.body;

        if (!code || !discountType || discountValue == null) {
            res.status(400).json({ message: 'code, discountType, and discountValue are required.' });
            return;
        }

        // Admins can only create coupons scoped to their own movies/showtimes
        if (user.role === 'admin') {
            // REMOVED: Movie ownership check. Admins can create coupons for any movie, 
            // but the coupon will only work at their own theater (enforced in getQuote).

            if (showtimeId) {
                const showtime = await Showtime.findByPk(showtimeId, {
                    include: [{ model: Screen, include: [Theater] as any }] as any,
                });
                const theaterOwnerId = (showtime as any)?.screen?.theater?.ownerId;
                if (!showtime || theaterOwnerId !== user.id) {
                    res.status(403).json({ message: 'You can only create coupons for your own showtimes.' });
                    return;
                }
            }
        }

        const coupon = await Coupon.create({
            code: String(code).toUpperCase(),
            createdBy: user.id,
            discountType,
            discountValue,
            maxUses: maxUses ?? null,
            perUserLimit: perUserLimit ?? null,
            minOrderValue: minOrderValue ?? 0,
            validFrom: validFrom ?? null,
            expiresAt: expiresAt ?? null,
            movieId: movieId ?? null,
            showtimeId: showtimeId ?? null,
            seatCategory: seatCategory ?? null,
            paymentMethod: paymentMethod ?? null,
            isActive: isActive !== false,
        });

        res.status(201).json(coupon);
    } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(409).json({ message: 'Coupon code already exists.' });
            return;
        }
        console.error('[PricingController] createCoupon error:', error);
        res.status(500).json({ message: 'Error creating coupon.' });
    }
};

export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        const coupon = await Coupon.findByPk(Number(req.params.id));
        if (!coupon) { res.status(404).json({ message: 'Coupon not found.' }); return; }

        // Only the creator can update
        if (coupon.createdBy !== user.id) {
            res.status(403).json({ message: 'You are not authorized to update this coupon.' });
            return;
        }

        await coupon.update(req.body);
        res.json(coupon);
    } catch (error) {
        res.status(500).json({ message: 'Error updating coupon.' });
    }
};

export const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        const coupon = await Coupon.findByPk(Number(req.params.id));
        if (!coupon) { res.status(404).json({ message: 'Coupon not found.' }); return; }

        if (coupon.createdBy !== user.id) {
            res.status(403).json({ message: 'You are not authorized to delete this coupon.' });
            return;
        }

        await coupon.destroy();
        res.json({ message: 'Coupon deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting coupon.' });
    }
};
