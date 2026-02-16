import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const isProduction = process.env.NODE_ENV === 'production';
const shouldUseRedis = Boolean(redisUrl || redisHost || !isProduction);

let redis: Redis | null = null;

if (!shouldUseRedis) {
    console.warn('[Redis] Disabled. Set REDIS_URL or REDIS_HOST to enable.');
} else {
    const host = redisHost || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379');

    console.log(redisUrl ? '[Redis] Connecting with REDIS_URL...' : `[Redis] Connecting to ${host}:${port}...`);

    redis = redisUrl
        ? new Redis(redisUrl, {
            retryStrategy: (times) => Math.min(times * 50, 2000)
        })
        : new Redis({
            host,
            port,
            retryStrategy: (times) => Math.min(times * 50, 2000)
        });

    redis.on('connect', () => {
        console.log('[Redis] Connected successfully');
    });

    redis.on('error', (err) => {
        console.error('[Redis] Connection error:', err);
    });
}

export default redis;
