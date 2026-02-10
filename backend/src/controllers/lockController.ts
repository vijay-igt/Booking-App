import { Request, Response } from 'express';
import { LockService } from '../services/lockService';

export const lockSeats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { showtimeId, seatIds } = req.body;
        const userId = (req as any).user.id; // From auth middleware
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

        res.status(200).json({ message: 'Seats locked successfully', expiresIn: 300 });
    } catch (error) {
        console.error('Lock error:', error);
        res.status(500).json({ message: 'Internal server error during locking' });
    }
};

export const unlockSeats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { showtimeId, seatIds } = req.body;
        // Ideally we should validate that the user OWNS the lock before unlocking,
        // but for now, releaseLock just deletes the key.
        // A malicious user could unlock others' seats if they guess the IDs?
        // Yes. So let's validate first.
        const userId = (req as any).user.id;
        const isValid = await LockService.validateLock(showtimeId, seatIds, userId);

        if (isValid) {
            await LockService.releaseLock(showtimeId, seatIds);
            res.status(200).json({ message: 'Seats unlocked' });
        } else {
            res.status(403).json({ message: 'You do not hold the lock for these seats' });
        }

    } catch (error) {
        console.error('Unlock error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
