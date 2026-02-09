import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import { Request } from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
};

// Also log the URL presence if individual keys are missing
if (!cloudinaryConfig.cloud_name) {
    console.log('CLOUDINARY_CLOUD_NAME is missing, checking for CLOUDINARY_URL...');
    if (process.env.CLOUDINARY_URL) {
        console.log('CLOUDINARY_URL is present.');
    } else {
        console.log('CLOUDINARY_URL is also missing.');
    }
}

console.log('Cloudinary Init State:', {
    cloud_name: cloudinaryConfig.cloud_name || 'MISSING',
    api_key: !!cloudinaryConfig.api_key ? 'PRESENT' : 'MISSING',
    api_secret: !!cloudinaryConfig.api_secret ? 'PRESENT' : 'MISSING'
});

cloudinary.config(cloudinaryConfig);

// Configure Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'booking-app-posters',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
    } as any,
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!') as any, false);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (Cloudinary handles large files well)
});
