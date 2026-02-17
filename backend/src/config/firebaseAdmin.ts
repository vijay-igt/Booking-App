import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

const loadServiceAccount = () => {
    if (serviceAccountJson) {
        return JSON.parse(serviceAccountJson);
    }
    if (serviceAccountBase64) {
        const decoded = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
        return JSON.parse(decoded);
    }
    if (serviceAccountPath) {
        return require(path.resolve(process.cwd(), serviceAccountPath));
    }
    return null;
};

const serviceAccount = loadServiceAccount();

if (!serviceAccount) {
    console.warn('[FirebaseAdmin] Firebase service account not configured. Push notifications will be disabled.');
} else {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('[FirebaseAdmin] Initialized successfully');
    } catch (error) {
        console.error('[FirebaseAdmin] Failed to initialize:', error);
    }
}

export default admin;
