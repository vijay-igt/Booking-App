import { Request, Response } from 'express';
import { LockService } from '../services/lockService';

export const lockSeats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { showtimeId, seatIds } = req.body;
        const userId = req.user!.id; // From auth middleware
        console.log(`[LockController] User ${userId} attempting to lock seats ${seatIds} for showtime ${showtimeId}`);

        if (!showtimeId || !seatIds || !Array.isArray(seatIds)) {
            res.status(400).json({ message: 'Invalid request data' });
            return;
        }

        const success = await LockService.acquireLock(showtimeId, seatIds, userId);

        if (!success) {
            res.status(409).json({ message: 'One or more seats are already locked by another user.' });
            return;
        }

        res.status(200).json({ message: 'Seats locked successfully', expiresIn: 600 });
    } catch (error) {
        console.error('Lock error:', error);
        res.status(500).json({ message: 'Internal server error during locking' });
    }
};

export const unlockSeats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { showtimeId, seatIds } = req.body;
        const userId = req.user!.id;
        console.log(`[LockController] User ${userId} attempting to unlock seats ${seatIds} for showtime ${showtimeId}`);

        // Perform release directly. The service/Lua script ensures you only release what you own.
        // This avoids 403 errors if the lock has already expired (which is effectively a success).
        await LockService.releaseLock(showtimeId, seatIds, userId);
        res.status(200).json({ message: 'Seats unlocked (idempotent)' });

    } catch (error) {
        console.error('Unlock error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
