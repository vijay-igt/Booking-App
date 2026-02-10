import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/useAuth';

interface NotificationPayload {
    type: string;
    userId?: number;
    amount?: number;
    requestId?: string;
    newBalance?: number;
    message?: string;
}

interface WebSocketServiceProps {
    onNewNotification?: (notification: NotificationPayload) => void;
    onWalletUpdate?: (update: NotificationPayload) => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

export const useWebSocketService = ({ onNewNotification, onWalletUpdate }: WebSocketServiceProps) => {
    const authContext = useAuth();
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectAttemptsRef = useRef(0); // Use ref for reconnect attempts
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_INTERVAL_MS = 5000;

    const onNewNotificationRef = useRef(onNewNotification);
    const onWalletUpdateRef = useRef(onWalletUpdate);
    const userRef = useRef(authContext.user);
    const connectRef = useRef<(() => void) | null>(null); // Ref for the connect function

    useEffect(() => {
        onNewNotificationRef.current = onNewNotification;
    }, [onNewNotification]);

    useEffect(() => {
        onWalletUpdateRef.current = onWalletUpdate;
    }, [onWalletUpdate]);

    useEffect(() => {
        userRef.current = authContext.user;
    }, [authContext.user]);


    const connect = useCallback(() => {
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log('Attempting to connect to WebSocket...');
        const newWs = new WebSocket(WS_URL);

        newWs.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
            reconnectAttemptsRef.current = 0;
            if (userRef.current?.id && userRef.current?.role) {
                newWs.send(JSON.stringify({ type: 'AUTH', userId: userRef.current.id, role: userRef.current.role }));
            }
        };

        newWs.onmessage = (event) => {
            const message: NotificationPayload = JSON.parse(event.data);
            console.log('WebSocket message received:', message);

            if (message.type === 'ADMIN_TOPUP_REQUEST') {
                toast.info(`New Top-Up Request: User ${message.userId} for ${message.amount}`, {
                    position: 'top-right',
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
                onNewNotificationRef.current?.(message);
            } else if (message.type === 'USER_TOPUP_APPROVED') {
                 toast.success(`Wallet Top-Up Approved! New balance: ${message.newBalance}`, {
                     position: 'top-right',
                     autoClose: 5000,
                     hideProgressBar: false,
                     closeOnClick: true,
                     pauseOnHover: true,
                     draggable: true,
                     progress: undefined,
                     toastId: message.requestId
                 });
                 onWalletUpdateRef.current?.(message);
             } else if (message.type === 'USER_TOPUP_REJECTED') {
                 toast.error(`Wallet Top-Up Request Rejected.`, {
                     position: 'top-right',
                     autoClose: 5000,
                     hideProgressBar: false,
                     closeOnClick: true,
                     pauseOnHover: true,
                     draggable: true,
                     progress: undefined,
                     toastId: message.requestId
                 });
                 onWalletUpdateRef.current?.(message);
             }
        };

        newWs.onclose = (event) => {
            setIsConnected(false);
            console.log('WebSocket disconnected:', event.code, event.reason);
            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                const timer = setTimeout(() => {
                    reconnectAttemptsRef.current += 1;
                    connectRef.current?.(); // Call through the ref
                }, RECONNECT_INTERVAL_MS);
                return () => clearTimeout(timer);
            } else {
                console.error('Max reconnect attempts reached. Not attempting to reconnect.');
                toast.error('Disconnected from real-time updates. Please refresh the page.', { autoClose: false });
            }
        };

        newWs.onerror = (error) => {
            console.error('WebSocket error:', error);
            newWs.close();
        };

        ws.current = newWs;
    }, []);

    useEffect(() => {
        connectRef.current = connect; // Update the ref whenever connect changes
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connect]);

    useEffect(() => {
        if (isConnected && userRef.current?.id && userRef.current?.role && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'AUTH', userId: userRef.current.id, role: userRef.current.role }));
        }
    }, [isConnected]);

    const sendMessage = useCallback((message: NotificationPayload) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not open. Message not sent:', message);
        }
    }, []);

    return { isConnected, sendMessage };
};
