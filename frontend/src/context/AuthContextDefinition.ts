import { createContext } from 'react';

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
