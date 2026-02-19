/**
 * pricingEngine.ts
 *
 * Pure, synchronous pricing calculation engine.
 * No DB queries — all data must be pre-fetched by the caller.
 * Designed to run in < 5 ms per seat, well within the 100 ms SLA.
 *
 * Calculation order:
 *   1. Base price (from Showtime.tierPrices or Seat.price fallback)
 *   2. Apply PricingRules (sorted by priority ASC)
 *   3. Apply Membership discount
 *   4. Apply Coupon discount (last)
 */

import { PricingRule } from '../models/PricingRule';
import { Coupon } from '../models/Coupon';

// ─── Membership discount constants ────────────────────────────────────────────
const MEMBERSHIP_DISCOUNTS: Record<string, number> = {
    NONE: 0,
    SILVER: 0.05,   // 5%
    GOLD: 0.10,     // 10%
    PLATINUM: 0.15, // 15%
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PricingContext {
    /** Showtime start time — used for DAY_TYPE rule */
    showtimeDate: Date;
    /** Movie popularity score 0–100 */
    moviePopularityScore: number;
    /** Seat type string e.g. "Classic", "Premium", "Recliner" */
    seatCategory: string;
    /** Current occupancy percentage (0–100) */
    occupancyPercent: number;
    /** Showtime's demand surge threshold (from Showtime.occupancyThreshold) */
    occupancyThreshold: number;
    /** Base price for this seat (from Showtime.tierPrices[seatCategory] or Seat.price) */
    basePrice: number;
    /** User's membership tier */
    membershipTier: 'NONE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    /** Payment method used e.g. "WALLET", "CARD" */
    paymentMethod?: string;
}

export interface AppliedRuleInfo {
    name: string;
    ruleType: string;
    effect: string; // human-readable e.g. "×1.20" or "−₹50"
}

export interface CouponValidationError {
    valid: false;
    reason: string;
}

export interface CouponValidationSuccess {
    valid: true;
    discountAmount: number;
}

export type CouponValidationResult = CouponValidationError | CouponValidationSuccess;

export interface PriceBreakdown {
    basePrice: number;
    afterRules: number;
    appliedRules: AppliedRuleInfo[];
    membershipDiscountPercent: number;
    membershipDiscountAmount: number;
    afterMembership: number;
    couponDiscountAmount: number;
    afterCoupon: number;
    finalPrice: number;   // per seat, rounded to 2 decimal places
}

export interface BookingPriceResult {
    perSeatBreakdowns: PriceBreakdown[];
    totalPrice: number;
    couponError?: string;
}

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

// ─── Rule matching ─────────────────────────────────────────────────────────────

function ruleMatches(rule: PricingRule, ctx: PricingContext): boolean {
    const cond = rule.condition || {};

    switch (rule.ruleType) {
        case 'DAY_TYPE': {
            // condition.days: number[] — 0=Sunday, 6=Saturday
            const days: number[] = cond.days ?? [];
            const dayOfWeek = ctx.showtimeDate.getDay();
            return days.includes(dayOfWeek);
        }
        case 'POPULARITY': {
            // condition.minScore: number
            const minScore: number = cond.minScore ?? 0;
            return ctx.moviePopularityScore >= minScore;
        }
        case 'SEAT_CATEGORY': {
            // condition.category: string
            const category: string = cond.category ?? '';
            return ctx.seatCategory.toLowerCase() === category.toLowerCase();
        }
        case 'DEMAND_SURGE': {
            return ctx.occupancyPercent >= ctx.occupancyThreshold;
        }
        case 'FLAT_DISCOUNT': {
            // Always applies (admin promo)
            return true;
        }
        default:
            return false;
    }
}

// ─── Core calculation ──────────────────────────────────────────────────────────

/**
 * Calculate the final price for a single seat.
 * Coupon discount is NOT applied here — it's applied at the booking level
 * after summing all seats (since minOrderValue is checked against total).
 */
export function calculateSeatPrice(
    ctx: PricingContext,
    rules: PricingRule[],
): PriceBreakdown {
    let price = ctx.basePrice;
    const appliedRules: AppliedRuleInfo[] = [];

    // Step 1: Apply rules in priority order (already sorted by caller)
    for (const rule of rules) {
        if (!rule.isActive) continue;

        const pricingDate = toDateOnly(ctx.showtimeDate);
        if (rule.validFrom && pricingDate < rule.validFrom) continue;
        if (rule.validUntil && pricingDate > rule.validUntil) continue;

        if (!ruleMatches(rule, ctx)) continue;

        if (rule.multiplier !== null && rule.multiplier !== undefined) {
            const mult = Number(rule.multiplier);
            price = price * mult;
            appliedRules.push({
                name: rule.name,
                ruleType: rule.ruleType,
                effect: `×${mult.toFixed(2)}`,
            });
        } else if (rule.flatDiscount !== null && rule.flatDiscount !== undefined) {
            const disc = Number(rule.flatDiscount);
            price = Math.max(0, price - disc);
            appliedRules.push({
                name: rule.name,
                ruleType: rule.ruleType,
                effect: `−₹${disc.toFixed(2)}`,
            });
        }
    }

    const afterRules = price;

    // Step 2: Membership discount
    const membershipDiscountPercent = MEMBERSHIP_DISCOUNTS[ctx.membershipTier] ?? 0;
    const membershipDiscountAmount = afterRules * membershipDiscountPercent;
    price = afterRules - membershipDiscountAmount;
    const afterMembership = price;

    // Coupon applied later at booking level
    const finalPrice = Math.max(1, Math.round(price * 100) / 100);

    return {
        basePrice: ctx.basePrice,
        afterRules,
        appliedRules,
        membershipDiscountPercent: membershipDiscountPercent * 100,
        membershipDiscountAmount,
        afterMembership,
        couponDiscountAmount: 0, // filled in by validateAndApplyCoupon
        afterCoupon: finalPrice,
        finalPrice,
    };
}

// ─── Coupon validation ─────────────────────────────────────────────────────────

export interface CouponValidationInput {
    coupon: Coupon;
    totalBeforeCoupon: number;
    userId: number;
    /** How many times this user has already used this coupon */
    userUsageCount: number;
    movieId?: number;
    showtimeId?: number;
    showtimeDate?: Date;
    seatCategories?: string[];
    paymentMethod?: string;
}

export function validateCoupon(input: CouponValidationInput): CouponValidationResult {
    const { coupon, totalBeforeCoupon, userUsageCount } = input;
    const today = toDateOnly(input.showtimeDate ?? new Date());

    // Normalise: Sequelize may return "" instead of null for optional DATE columns
    const validFrom = coupon.validFrom || null;
    const expiresAt = coupon.expiresAt || null;

    if (!coupon.isActive) {
        return { valid: false, reason: 'Coupon is inactive.' };
    }
    if (validFrom && today < validFrom) {
        return { valid: false, reason: 'Coupon is not yet valid.' };
    }
    if (expiresAt && today > expiresAt) {
        return { valid: false, reason: 'Coupon has expired.' };
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return { valid: false, reason: 'Coupon has been fully redeemed.' };
    }
    if (coupon.perUserLimit !== null && userUsageCount >= coupon.perUserLimit) {
        return { valid: false, reason: 'You have already used this coupon the maximum number of times.' };
    }
    if (totalBeforeCoupon < Number(coupon.minOrderValue)) {
        return { valid: false, reason: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon.` };
    }
    if (coupon.movieId !== null && coupon.movieId !== input.movieId) {
        return { valid: false, reason: 'This coupon is not valid for the selected movie.' };
    }
    if (coupon.showtimeId !== null && coupon.showtimeId !== input.showtimeId) {
        return { valid: false, reason: 'This coupon is not valid for the selected showtime.' };
    }
    if (coupon.seatCategory !== null) {
        const cats = (input.seatCategories ?? []).map(c => c.toLowerCase());
        if (!cats.includes(coupon.seatCategory.toLowerCase())) {
            return { valid: false, reason: `This coupon is only valid for ${coupon.seatCategory} seats.` };
        }
    }
    if (coupon.paymentMethod !== null && coupon.paymentMethod !== input.paymentMethod) {
        return { valid: false, reason: `This coupon is only valid for ${coupon.paymentMethod} payments.` };
    }

    // All checks passed — calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENT') {
        discountAmount = (totalBeforeCoupon * Number(coupon.discountValue)) / 100;
    } else {
        discountAmount = Number(coupon.discountValue);
    }

    // Discount cannot exceed the total
    discountAmount = Math.min(discountAmount, totalBeforeCoupon);

    return { valid: true, discountAmount: Math.round(discountAmount * 100) / 100 };
}

// ─── Membership discount constants export (for admin UI display) ───────────────
export { MEMBERSHIP_DISCOUNTS };
