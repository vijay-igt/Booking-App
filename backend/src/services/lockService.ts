import redis from '../config/redis';

const LOCK_TTL_SECONDS = 300; // 5 minutes

export class LockService {
    /**
     * Attempts to acquire locks for a set of seats.
     * Returns true if ALL seats were successfully locked.
     * Returns false if ANY seat is already locked by another user.
     */
    static async acquireLock(showtimeId: number, seatIds: number[], userId: number): Promise<boolean> {
        const keys = seatIds.map(seatId => `lock:showtime:${showtimeId}:seat:${seatId}`);

        // 1. Check if any seat is already locked by someone else
        for (const key of keys) {
            const currentLock = await redis.get(key);
            if (currentLock && currentLock !== userId.toString()) {
                console.warn(`[LockService] Seat ${key} already locked by ${currentLock}, but user ${userId} is trying to acquire it.`);
                return false; // Already locked by another user
            }
        }

        // 2. Acquire locks (Set if Not Exists)
        const results = await Promise.all(
            keys.map(key => redis.set(key, userId.toString(), 'EX', LOCK_TTL_SECONDS, 'NX'))
        );

        // Even though we checked, race condition could happen. 
        // If any 'NX' set returned null, it means it was locked in between.
        // However, since we want to allow re-locking by same user (refresh), we need to handle that.

        // Revised Strategy:
        // Use a pipeline or Lua script for atomicity, but for simplicity:
        // We will just force set if it's the same user, or fail if different.

        const multi = redis.multi();
        keys.forEach(key => {
            // we can't conditionally set in multi without watching, 
            // so we'll rely on the pre-check and optimistic locking logic for now.
            // Ideally, we'd use 'WATCH'.
            redis.set(key, userId.toString(), 'EX', LOCK_TTL_SECONDS);
        });

        // A better approach for strict correctness without Lua:
        // 1. Try to set NX. 
        // 2. If fails, check if value == userId. If so, update TTL.

        for (const key of keys) {
            const result = await redis.set(key, userId.toString(), 'EX', LOCK_TTL_SECONDS, 'NX');
            if (!result) {
                const holder = await redis.get(key);
                if (holder !== userId.toString()) {
                    // Locked by someone else - ROLLBACK (release any we just took? complex)
                    // For MVP: We fail and let the user try again or handle partials?
                    // Let's return false. Ideally we should release the ones we just took, 
                    // but since we doing one-by-one, we can just release all we tried.
                    await this.releaseLock(showtimeId, seatIds.filter(id => keys.indexOf(`lock:showtime:${showtimeId}:seat:${id}`) < keys.indexOf(key)));
                    return false;
                }
                // If holder IS us, we just refreshed the TTL (by set call above if we didn't use NX, but here we used NX)
                // So we must explicitly update TTL
                await redis.expire(key, LOCK_TTL_SECONDS);
            }
        }

        return true;
    }

    static async releaseLock(showtimeId: number, seatIds: number[]): Promise<void> {
        const keys = seatIds.map(seatId => `lock:showtime:${showtimeId}:seat:${seatId}`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }

    static async validateLock(showtimeId: number, seatIds: number[], userId: number): Promise<boolean> {
        const keys = seatIds.map(seatId => `lock:showtime:${showtimeId}:seat:${seatId}`);
        const values = await redis.mget(...keys);

        // Every key must exist AND belong to the user
        return values.every(val => val === userId.toString());
    }
}
