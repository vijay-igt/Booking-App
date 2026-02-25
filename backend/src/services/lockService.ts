import redis from '../config/redis';

const LOCK_TTL_SECONDS = 610; // 10 minutes + 10s buffer

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

type LockEntry = {
    userId: number;
    expiresAt: number;
};

const inMemoryLocks = new Map<string, LockEntry>();

const getEntry = (key: string) => {
    const entry = inMemoryLocks.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        inMemoryLocks.delete(key);
        return null;
    }
    return entry;
};

export class LockService {
    /**
     * Attempts to acquire locks for a set of seats.
     * Returns true if ALL seats were successfully locked.
     * Returns false if ANY seat is already locked by another user.
     */
    static async acquireLock(showtimeId: number, seatIds: number[], userId: number): Promise<boolean> {
        const keys = seatIds.map(seatId => `lock:showtime:${showtimeId}:seat:${seatId}`);

        if (!redis) {
            const now = Date.now();
            for (const key of keys) {
                const entry = getEntry(key);
                if (entry && entry.userId !== userId) return false;
            }
            const expiresAt = now + LOCK_TTL_SECONDS * 1000;
            keys.forEach(key => inMemoryLocks.set(key, { userId, expiresAt }));
            return true;
        }

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

        if (!redis) {
            keys.forEach((key) => {
                const entry = getEntry(key);
                if (entry && entry.userId === userId) {
                    inMemoryLocks.delete(key);
                }
            });
            return;
        }

        try {
            console.log(`[LockService] Releasing locks for user ${userId}: ${keys}`);
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
        if (!redis) {
            const isValid = keys.every((key) => {
                const entry = getEntry(key);
                return entry?.userId === userId;
            });
            console.log(`[LockService] InMemory ValidateLock for ${userId}: keys=${keys}, result=${isValid}`);
            return isValid;
        }

        const values = await redis.mget(...keys);

        // Every key must exist AND belong to the user
        const isValid = values.every(val => val === userId.toString());
        return isValid;
    }
}
