import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (error) {
        console.error('JWT Verification Error:', (error as any).message);
        res.status(403).json({ message: 'Invalid or expired token.', error: (error as any).message });
    }
};
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    authenticateToken(req, res, () => {
        if ((req as any).user?.role !== 'admin') {
            res.status(403).json({ message: 'Access denied. Admin role required.' });
            return;
        }
        next();
    });
};
