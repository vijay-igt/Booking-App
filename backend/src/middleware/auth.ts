import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User'; // Import the User model

interface JwtPayload {
    id: number;
    role: string;
    name: string;
    email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('authenticateToken: No token provided.');
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        console.log('authenticateToken: Decoded JWT payload:', decoded);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            console.log('authenticateToken: User not found for ID:', decoded.id);
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        console.log('authenticateToken: User found:', user.id, user.email);
        req.user = user; // Assign the full User object
        next();
    } catch (error) {
        console.error('JWT Verification Error:', (error as any).message);
        res.status(403).json({ message: 'Invalid or expired token.', error: (error as any).message });
    }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        next();
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        const user = await User.findByPk(decoded.id);

        if (!user) {
            // If user not found, proceed without req.user
            next();
            return;
        }

        req.user = user; // Assign the full User object
        next();
    } catch (error) {
        console.error('JWT Verification Error (Optional):', (error as any).message);
        res.status(403).json({ message: 'Invalid or expired token.', error: (error as any).message });
    }
};

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    authenticateToken(req, res, () => {
        const userRole = req.user?.role;
        if (userRole !== 'admin' && userRole !== 'super_admin') {
            res.status(403).json({ message: 'Access denied. Admin or Super Admin role required.' });
            return;
        }
        next();
    });
};

export const superAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    authenticateToken(req, res, () => {
        if (req.user?.role !== 'super_admin') {
            res.status(403).json({ message: 'Access denied. Super Admin role required.' });
            return;
        }
        next();
    });
};
