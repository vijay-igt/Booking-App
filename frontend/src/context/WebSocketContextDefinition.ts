import { createContext, useContext } from 'react';

export interface WebSocketMessage {
    type: string;
    [key: string]: unknown;
}

export interface WebSocketContextType {
    isConnected: boolean;
    sendMessage: (message: WebSocketMessage) => void;
    subscribe: (type: string, callback: (payload: WebSocketMessage) => void) => () => void;
}

export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};
