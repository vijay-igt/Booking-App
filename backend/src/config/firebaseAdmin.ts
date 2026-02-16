import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
    console.warn('[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT_PATH not found in .env. Push notifications will be disabled.');
} else {
    try {
        const serviceAccount = require(path.resolve(process.cwd(), serviceAccountPath));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('[FirebaseAdmin] Initialized successfully');
    } catch (error) {
        console.error('[FirebaseAdmin] Failed to initialize:', error);
    }
}

export default admin;
