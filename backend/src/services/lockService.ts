import redis from '../config/redis';

const LOCK_TTL_SECONDS = 300; // 5 minutes

const ACQUIRE_LOCKS_LUA = `
local userId = ARGV[1]
local ttl = ARGV[2]
for i, key in ipairs(KEYS) do
    local holder = redis.call('GET', key)
    if holder and holder ~= userId then
        return 0
    end
end
for i, key in ipairs(KEYS) do
    redis.call('SET', key, userId, 'EX', ttl)
end
return 1
`;

const RELEASE_LOCKS_LUA = `
local userId = ARGV[1]
for i, key in ipairs(KEYS) do
    local holder = redis.call('GET', key)
    if holder == userId then
        redis.call('DEL', key)
    end
end
return 1
`;

export class LockService {
    /**
     * Attempts to acquire locks for a set of seats.
     * Returns true if ALL seats were successfully locked.
     * Returns false if ANY seat is already locked by another user.
     */
    static async acquireLock(showtimeId: number, seatIds: number[], userId: number): Promise<boolean> {
        const keys = seatIds.map(seatId => `lock:showtime:${showtimeId}:seat:${seatId}`);

        try {
            const result = await redis.eval(
                ACQUIRE_LOCKS_LUA,
                keys.length,
                ...keys,
                userId.toString(),
                LOCK_TTL_SECONDS.toString()
            );
            return result === 1;
        } catch (error) {
            console.error('[LockService] Lua acquireLock error:', error);
            return false;
        }
    }

    static async releaseLock(showtimeId: number, seatIds: number[], userId: number): Promise<void> {
        const keys = seatIds.map(seatId => `lock:showtime:${showtimeId}:seat:${seatId}`);
        if (keys.length === 0) return;

        try {
            await redis.eval(
                RELEASE_LOCKS_LUA,
                keys.length,
                ...keys,
                userId.toString()
            );
        } catch (error) {
            console.error('[LockService] Lua releaseLock error:', error);
        }
    }

    static async validateLock(showtimeId: number, seatIds: number[], userId: number): Promise<boolean> {
        const keys = seatIds.map(seatId => `lock:showtime:${showtimeId}:seat:${seatId}`);
        const values = await redis.mget(...keys);

        // Every key must exist AND belong to the user
        return values.every(val => val === userId.toString());
    }
}
