import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AuthContext, type User } from './AuthContextDefinition';
import { jwtDecode } from 'jwt-decode';
import api from '../api';
import { requestForToken } from '../config/firebase';

interface DecodedToken {
    id: number;
    role: string;
    exp: number; // Expiration time
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('pushToken');
        localStorage.removeItem('pushUserId');
    }, []);

    const fetchUser = useCallback(async (userId: number, authToken: string) => {
        try {
            const response = await api.get(`/auth/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });
            console.log('Fetched user data from API:', response.data);
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
        } catch (error) {
            console.error('Failed to fetch user details:', error);
            logout(); // Log out if user details cannot be fetched
        }
    }, [logout]);

    useEffect(() => {
        const initializeAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            console.log('AuthContext Initialization:', { hasToken: !!storedToken, hasUser: !!storedUser, storedToken, storedUser });

            if (storedToken) {
                try {
                    const decodedToken: DecodedToken = jwtDecode(storedToken);
                    console.log('Decoded token during initialization:', decodedToken);
                    if (decodedToken.exp * 1000 < Date.now()) {
                        // Token expired
                        console.log('Token expired during initialization.');
                        logout();
                    } else {
                        setToken(storedToken);
                        if (storedUser) {
                            const parsedUser = JSON.parse(storedUser);
                            setUser(parsedUser);
                            console.log('User loaded from localStorage:', parsedUser);
                            // Always fetch latest user data to ensure roles/status are up to date
                            fetchUser(decodedToken.id, storedToken);
                        } else {
                            // If token exists but user data is missing, fetch it
                            console.log('Token found, but user data missing. Fetching user...');
                            await fetchUser(decodedToken.id, storedToken);
                        }
                    }
                } catch (error) {
                    console.error('Error decoding token during initialization:', error);
                    logout();
                }
            }
            setIsLoading(false);
            console.log('AuthContext initialized. IsAuthenticated:', !!storedToken);
        };
        initializeAuth();
    }, [fetchUser, logout]);

    useEffect(() => {
        if (!user || !token) return;
        let isActive = true;

        const registerPush = async () => {
            const currentToken = await requestForToken();
            if (!currentToken || !isActive) return;

            const storedToken = localStorage.getItem('pushToken');
            const storedUserId = localStorage.getItem('pushUserId');
            if (storedToken === currentToken && storedUserId === String(user.id)) return;

            try {
                await api.post('/notifications/subscribe', {
                    token: currentToken,
                    platform: 'web'
                });
                localStorage.setItem('pushToken', currentToken);
                localStorage.setItem('pushUserId', String(user.id));
            } catch (error) {
                console.error('[Push] Failed to sync token with backend:', error);
            }
        };

        registerPush();

        return () => {
            isActive = false;
        };
    }, [user, token]);

    const login = useCallback(async (newToken: string, userData: User) => {
        console.log('Login called with new token and user data:', { newToken, userData });
        setToken(newToken);
        setUser(userData); // Set user data directly from login response
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData)); // Store full user data
        // No need to call fetchUser here, as userData is already complete
    }, []);

    console.log('AuthContext render. User:', user, 'Token:', token ? 'present' : 'absent', 'IsLoading:', isLoading, 'IsAuthenticated:', !!token);

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated: !!token, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};


