import { Router, Request, Response } from 'express';
import { upload } from '../utils/upload';

const router = Router();

/**
 * @openapi
 * /api/upload:
 *   post:
 *     tags:
 *       - Upload
 *     summary: Upload an image to Cloudinary
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: No file uploaded
 */
router.post('/', upload.single('image'), (req: Request, res: Response) => {
    try {
        const file = (req as any).file;
        if (!file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        // Return the Cloudinary URL
        res.json({ url: file.path });
    } catch (error) {
        console.error('Upload Route Error:', error);
        res.status(500).json({ message: 'Error uploading file', error: (error as any).message || error });
    }
});

export default router;
