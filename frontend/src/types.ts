export interface Movie {
    id: number;
    title: string;
    description: string;
    genre: string;
    duration: number;
    rating: string;
    posterUrl: string;
    bannerUrl?: string;
    releaseDate?: string;
    language?: string;
    audio?: string;
    format?: string;
    ownerId?: number;
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
    trackingId?: string;
    createdAt: string;
    user?: {
        name: string;
        email: string;
    };
    showtime?: Showtime;
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