export interface Movie {
    id: number;
    title: string;
    description: string;
    genre: string;
    duration: number;
    rating: string;
    posterUrl: string;
    bannerUrl?: string;
    trailerUrl?: string;
    releaseDate?: string;
    language?: string;
    audio?: string;
    format?: string;
    ownerId?: number;
    popularityScore?: number;
}

export interface Theater {
    id: number;
    name: string;
    location: string;
    owner?: {
        id: number;
        name: string;
        email: string;
    };
    screens?: Screen[];
}

export interface Screen {
    id: number;
    name: string;
    theaterId: number;
    theater?: Theater;
}

export interface Showtime {
    id: number;
    movieId: number;
    screenId: number;
    startTime: string;
    endTime: string;
    tierPrices: Record<string, number>;
    movie?: Movie;
    screen?: Screen;
}

export interface Booking {
    id: number;
    userId: number;
    showtimeId: number;
    totalAmount: number;
    status: string;
    refunded?: boolean;
    cancellationReason?: string | null;
    trackingId?: string;
    createdAt: string;
    user?: {
        name: string;
        email: string;
    };
    showtime?: Showtime;
    seats?: Seat[];
}

export interface User {
    id: number;
    name?: string;
    email: string;
    role: string;
    createdAt: string;
    walletBalance?: number;
    commissionRate?: number;
    adminRequestStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
    membershipTier?: 'NONE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

export interface WalletRequest {
    id: number;
    userId: number;
    amount: string | number;
    paymentMethod: string;
    transactionRef: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    user?: User;
}

export interface Transaction {
    id: number;
    userId: number;
    walletRequestId?: number;
    amount: string | number;
    type: 'CREDIT' | 'DEBIT';
    description: string;
    createdAt: string;
}

export interface Activity {
    id: number;
    type: string;
    description: string;
    timestamp: string;
    email?: string;
    title?: string;
    userId?: number;
    trackingId?: string;
}

export interface Seat {
    id: number;
    screenId: number;
    row: string;
    number: number;
    type: string;
    price: number;
}

export interface SeatTierConfig {
    name: string;
    rows: number;
    price: number;
}

export interface SuperAdminDashboardStats {
    totalRevenue: number;
    totalOwners: number;
    pendingApprovals: number;
}

export interface AdminDashboardStats {
    totalBookings: number;
    totalEarnings: number;
    commissionPaid: number;
    commissionRate: number;
}

export type DashboardStats = SuperAdminDashboardStats | AdminDashboardStats;

// ─── Pricing Engine Types ──────────────────────────────────────────────────────

export interface AppliedRuleInfo {
    name: string;
    ruleType: string;
    effect: string; // e.g. '×1.20' or '−₹50'
}

export interface SeatPriceBreakdown {
    seatId: number;
    seatType: string;
    basePrice: number;
    afterRules: number;
    appliedRules: AppliedRuleInfo[];
    membershipDiscountPercent: number;
    membershipDiscountAmount: number;
    afterMembership: number;
    couponDiscountAmount: number;
    afterCoupon: number;
    finalPrice: number;
}

export interface PricingQuoteResponse {
    showtimeId: number;
    movie: string;
    seats: SeatPriceBreakdown[];
    subtotal: number;
    coupon: {
        code: string;
        discountType: 'PERCENT' | 'FLAT';
        discountValue: number;
        discountAmount: number;
    } | null;
    couponError?: string;
    couponDiscount: number;
    total: number;
    membershipTier: 'NONE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    calculationMs: number;
}

export interface PricingRule {
    id: number;
    name: string;
    ruleType: 'DAY_TYPE' | 'POPULARITY' | 'SEAT_CATEGORY' | 'DEMAND_SURGE' | 'FLAT_DISCOUNT';
    condition: Record<string, unknown>;
    multiplier: number | null;
    flatDiscount: number | null;
    priority: number;
    isActive: boolean;
    validFrom: string | null;
    validUntil: string | null;
    createdAt: string;
}

export interface Coupon {
    id: number;
    code: string;
    createdBy: number;
    discountType: 'PERCENT' | 'FLAT';
    discountValue: number;
    maxUses: number | null;
    usedCount: number;
    perUserLimit: number | null;
    minOrderValue: number;
    validFrom: string | null;
    expiresAt: string | null;
    movieId: number | null;
    showtimeId: number | null;
    seatCategory: string | null;
    paymentMethod: string | null;
    isActive: boolean;
    createdAt: string;
}
export interface FoodItem {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    isVeg: boolean;
    calories: number;
    allergens: string;
    theaterId?: number | null;
}
