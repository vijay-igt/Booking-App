import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { getConsumer } from '../config/kafkaClient'; // Import Kafka consumer

interface CustomWebSocket extends WebSocket {
    userId?: number;
    role?: 'admin' | 'super_admin' | 'user';
    remoteAddress?: string;
}

let wss: WebSocketServer;
const clients: Map<number, CustomWebSocket[]> = new Map(); // Map userId to an array of WebSocket connections

export const initializeWebSocket = (server: http.Server) => {
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws: CustomWebSocket, request: http.IncomingMessage) => {
        const remoteAddress = request.socket.remoteAddress;
        ws.remoteAddress = remoteAddress; // Store remoteAddress on the WebSocket object
        console.log('WebSocket client connected from:', remoteAddress);

        ws.on('message', (message: string) => {
            console.log('Received raw WebSocket message:', message);
            try {
                const parsedMessage = JSON.parse(message);
                console.log('Parsed WebSocket message:', parsedMessage);
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

        ws.on('close', (event: CloseEvent) => {
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
                console.log(`User ${ws.userId} disconnected from ${ws.remoteAddress}. Code: ${event.code}, Reason: ${event.reason}`);
            } else {
                console.warn(`[WebSocket] Unauthenticated client disconnected from ${ws.remoteAddress}. Code: ${event.code}, Reason: ${event.reason}`);
            }
        });

        ws.on('error', (error: Error) => {
            console.error('WebSocket error:', error);
        });
    });

    console.log('WebSocket server initialized');
    startKafkaConsumer(); // Start Kafka consumer when WebSocket is initialized
    console.log('WebSocket server is ready to accept connections.');
};

const startKafkaConsumer = async () => {
    try {
        const consumer = await getConsumer('websocket-group'); // Use a unique consumer group ID
        if (!consumer) {
            console.error('Failed to get Kafka consumer. It might be null.');
            return;
        }
        await consumer.subscribe({ topic: 'booking-events', fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if (message.value) {
                    try {
                        const payload = JSON.parse(message.value.toString());
                        console.log(`[WebSocketService] Received Kafka message: ${JSON.stringify(payload)}`);

                        // Assuming payload contains userId and a message for the notification
                        if (payload.userId && payload.message) {
                            sendNotificationToUser(payload.userId, {
                                type: 'BOOKING_UPDATE',
                                status: payload.status,
                                message: payload.message,
                                bookingId: payload.bookingId,
                            });
                        } else if (payload.type === 'TOPUP_REQUESTED') {
                            sendNotificationToSuperAdmins({
                                type: 'ADMIN_TOPUP_REQUEST',
                                userId: payload.userId,
                                amount: payload.amount,
                                requestId: payload.requestId
                            });
                        } else {
                            console.warn('[WebSocketService] Kafka message missing expected fields:', payload);
                        }
                    } catch (error) {
                        console.error('[WebSocketService] Error parsing Kafka message:', error);
                    }
                }
            },
        });
        console.log('Kafka consumer for booking-events started.');
    } catch (error) {
        console.error('Error starting Kafka consumer for WebSocket service:', error);
    }
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

export const sendNotificationToSuperAdmins = (payload: any) => {
    wss.clients.forEach(client => {
        const customClient = client as CustomWebSocket;
        if (customClient.readyState === WebSocket.OPEN && customClient.role === 'super_admin') {
            customClient.send(JSON.stringify(payload));
        }
    });
    console.log('Notification sent to connected super admins.');
};
