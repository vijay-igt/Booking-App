import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging, type MessagePayload } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log('[Firebase] Initializing with Project ID:', firebaseConfig.projectId);

if (!firebaseConfig.apiKey || !firebaseConfig.messagingSenderId || !firebaseConfig.appId) {
    console.error('[Firebase] Critical configuration error: Missing environment variables. Key:', !!firebaseConfig.apiKey, 'SenderId:', !!firebaseConfig.messagingSenderId, 'AppId:', !!firebaseConfig.appId);
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

try {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    console.log('[Firebase] SDK Initialized successfully');
} catch (error) {
    console.error('[Firebase] Initialization failed:', error);
}

export const requestForToken = async () => {
    if (!messaging) {
        console.error('[Firebase] Messaging not initialized. Cannot request token.');
        return null;
    }
    try {
        console.log('[Firebase] Requesting permission...');
        const permission = await Notification.requestPermission();
        console.log('[Firebase] Permission status:', permission);

        if (permission === 'granted') {
            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
            console.log('[Firebase] Using VAPID Key:', vapidKey ? 'Found' : 'Missing');

            // Explicitly register service worker
            if ('serviceWorker' in navigator) {
                console.log('[Firebase] Registering service worker manually...');
                try {
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                    console.log('[Firebase] Service Worker registered scope:', registration.scope);

                    const token = await getToken(messaging, {
                        vapidKey: vapidKey,
                        serviceWorkerRegistration: registration
                    });

                    if (token) {
                        console.log('[Firebase] Token generated successfully:', token);
                        return token;
                    } else {
                        console.log('[Firebase] No registration token available.');
                    }
                } catch (swError) {
                    console.error('[Firebase] Service Worker registration failed:', swError);
                }
            } else {
                console.error('[Firebase] Service Workers not supported in this browser.');
            }
        } else {
            console.warn('[Firebase] Notification permission denied.');
        }
    } catch (error) {
        console.error('[Firebase] Error retrieving token:', error);
    }
    return null;
};

export const onMessageListener = (callback: (payload: MessagePayload) => void) => {
    if (!messaging) {
        console.error('[Firebase] Messaging not initialized. Cannot listen for messages.');
        return () => undefined;
    }
    return onMessage(messaging, (payload) => {
        console.log('[Firebase] Foreground message received:', payload);

        // Show browser notification if in foreground and permission is granted
        if (Notification.permission === 'granted') {
            const title = payload.notification?.title || payload.data?.title || 'New Notification';
            const body = payload.notification?.body || payload.data?.message || '';

            if (title || body) {
                try {
                    new Notification(title, {
                        body: body,
                        icon: '/favicon.ico'
                    });
                } catch (err) {
                    console.error('[Firebase] Failed to show browser notification:', err);
                }
            }
        }

        callback(payload);
    });
};

export default messaging;
