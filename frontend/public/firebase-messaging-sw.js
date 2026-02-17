/* firebase-messaging-sw.js */
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBdexWo_IG68i62M2nV97eynpbm6wnC7B8",
    authDomain: "booking-app-afdc3.firebaseapp.com",
    projectId: "booking-app-afdc3",
    storageBucket: "booking-app-afdc3.firebasestorage.app",
    messagingSenderId: "971591984970",
    appId: "1:971591984970:web:cb5a823118efe3fb87c3b3"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

console.log('[ServiceWorker] Compat initialized');

// Background message listener
messaging.onBackgroundMessage((payload) => {
    console.log('[ServiceWorker] Received background message:', payload);

    const title = payload.notification?.title || payload.data?.title || 'New Notification';
    const body = payload.notification?.body || payload.data?.message || '';

    const notificationOptions = {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: payload.data
    };

    return self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
