import { createContext } from 'react';

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'user';
    adminRequestStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
    walletBalance?: string; // Added walletBalance
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, userData: User) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    fetchUser: (userId: number, authToken: string) => Promise<void>; // Added fetchUser
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
