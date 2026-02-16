import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './useAuth';
import { WebSocketContext, type WebSocketMessage } from './WebSocketContextDefinition';

const getWebSocketUrl = () => {
    const envWs = import.meta.env.VITE_WS_URL;
    if (envWs) return envWs;
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) return 'ws://localhost:5000';
    const normalized = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
    if (normalized.startsWith('https://')) return normalized.replace('https://', 'wss://');
    if (normalized.startsWith('http://')) return normalized.replace('http://', 'ws://');
    return normalized;
};

const WS_URL = getWebSocketUrl();

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const listeners = useRef<Map<string, Set<(payload: WebSocketMessage) => void>>>(new Map());
    const reconnectAttempts = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;
    const connectRef = useRef<() => void>(() => undefined);

    const connect = useCallback(() => {
        if (!user) return;
        if (ws.current?.readyState === WebSocket.OPEN) return;

        console.log('[WebSocket] Connecting to:', WS_URL);
        const socket = new WebSocket(WS_URL);

        socket.onopen = () => {
            console.log('[WebSocket] Connected');
            setIsConnected(true);
            reconnectAttempts.current = 0;
            socket.send(JSON.stringify({ type: 'AUTH', userId: user.id, role: user.role }));
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as WebSocketMessage;
                console.log('[WebSocket] Message received:', message);

                const typeListeners = listeners.current.get(message.type);
                if (typeListeners) {
                    typeListeners.forEach(callback => callback(message));
                }

                // Global toast notifications for specific message types
                if (message.type === 'ADMIN_TOPUP_REQUEST') {
                    toast.info(`New Top-Up Request: User ${message.userId} for ${message.amount}`);
                } else if (message.type === 'USER_TOPUP_APPROVED') {
                    toast.success(`Wallet Top-Up Approved! New balance: ${message.newBalance}`);
                } else if (message.type === 'USER_TOPUP_REJECTED') {
                    toast.error(`Wallet Top-Up Request Rejected.`);
                }
            } catch (err) {
                console.error('[WebSocket] Error parsing message:', err);
            }
        };

        socket.onclose = () => {
            setIsConnected(false);
            console.log('[WebSocket] Disconnected');
            if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                setTimeout(() => {
                    reconnectAttempts.current++;
                    connectRef.current();
                }, timeout);
            }
        };

        socket.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
            socket.close();
        };

        ws.current = socket;
    }, [user]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        if (user) {
            connect();
        } else if (ws.current) {
            ws.current.close();
        }
        return () => {
            if (ws.current) ws.current.close();
        };
    }, [user, connect]);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.warn('[WebSocket] Cannot send message, socket not open');
        }
    }, []);

    const subscribe = useCallback((type: string, callback: (payload: WebSocketMessage) => void) => {
        if (!listeners.current.has(type)) {
            listeners.current.set(type, new Set());
        }
        listeners.current.get(type)!.add(callback);

        return () => {
            const typeListeners = listeners.current.get(type);
            if (typeListeners) {
                typeListeners.delete(callback);
                if (typeListeners.size === 0) {
                    listeners.current.delete(type);
                }
            }
        };
    }, []);

    return (
        <WebSocketContext.Provider value={{ isConnected, sendMessage, subscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
};
