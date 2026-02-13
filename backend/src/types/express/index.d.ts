declare global {
    namespace Express {
        interface User {
            id: number;
            name: string;
            email: string;
            role: 'super_admin' | 'admin' | 'user';
            walletBalance: number;
            commissionRate: number;
            adminRequestStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
            token?: string;
        }
    }
}

export { };
