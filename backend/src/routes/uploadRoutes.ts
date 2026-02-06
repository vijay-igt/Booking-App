import { Router, Request, Response } from 'express';
import { upload } from '../utils/upload';

const router = Router();

router.post('/', upload.single('image'), (req: Request, res: Response) => {
    try {
        const file = (req as any).file;
        if (!file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        // Return the URL for the uploaded file
        // Assuming the server serves 'uploads' directory at /uploads
        const protocol = req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/${file.filename}`;

        res.json({ url: fileUrl });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading file', error });
    }
});

export default router;
