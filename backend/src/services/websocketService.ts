import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

interface CustomWebSocket extends WebSocket {
    userId?: number;
    role?: 'admin' | 'user';
}

let wss: WebSocketServer;
const clients: Map<number, CustomWebSocket[]> = new Map(); // Map userId to an array of WebSocket connections

export const initializeWebSocket = (server: http.Server) => {
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws: CustomWebSocket) => {
        console.log('WebSocket client connected');

        ws.on('message', (message: string) => {
            console.log('Received:', message);
            // Expecting a message like { type: 'AUTH', userId: 123 }
            try {
                const parsedMessage = JSON.parse(message);
                if (parsedMessage.type === 'AUTH' && parsedMessage.userId && parsedMessage.role) {
                    ws.userId = parsedMessage.userId;
                    ws.role = parsedMessage.role;
                    if (typeof ws.userId === 'number') { // Ensure userId is a number
                        if (!clients.has(ws.userId)) {
                            clients.set(ws.userId, []);
                        }
                        clients.get(ws.userId)?.push(ws);
                        console.log(`User ${ws.userId} (${ws.role}) authenticated and connected.`);
                    } else {
                        console.error('Authenticated userId is not a number:', ws.userId);
                    }
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message or authenticate:', error);
            }
        });

        ws.on('close', () => {
            if (ws.userId) {
                const userClients = clients.get(ws.userId);
                if (userClients) {
                    const index = userClients.indexOf(ws);
                    if (index > -1) {
                        userClients.splice(index, 1);
                    }
                    if (userClients.length === 0) {
                        clients.delete(ws.userId);
                    }
                }
                console.log(`User ${ws.userId} disconnected.`);
            } else {
                console.log('Unauthenticated WebSocket client disconnected.');
            }
        });

        ws.on('error', (error: Error) => {
            console.error('WebSocket error:', error);
        });
    });

    console.log('WebSocket server initialized');
};

export const sendNotificationToUser = (userId: number, payload: any) => {
    const userClients = clients.get(userId);
    if (userClients) {
        userClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(payload));
            }
        });
        console.log(`Notification sent to user ${userId}`);
    } else {
        console.log(`User ${userId} not connected via WebSocket.`);
    }
};

export const sendNotificationToAdmins = (payload: any) => {
    wss.clients.forEach(client => {
        const customClient = client as CustomWebSocket;
        if (customClient.readyState === WebSocket.OPEN && customClient.role === 'admin') {
            customClient.send(JSON.stringify(payload));
        }
    });
    console.log('Notification sent to connected admins.');
};
