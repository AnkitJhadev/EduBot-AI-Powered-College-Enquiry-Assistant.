const { Redis } = require('@upstash/redis');

// Initialize Redis client
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn('[REDIS] Warning: Redis URL or Token not configured');
} else {
  console.log('[REDIS] Initializing Redis client...');
  console.log('[REDIS] Redis URL:', redisUrl ? 'Set' : 'Not set');
  console.log('[REDIS] Redis Token:', redisToken ? 'Set' : 'Not set');
}

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

// Test Redis connection on startup
(async () => {
  try {
    await redis.ping();
    console.log('[REDIS] Redis connection successful');
  } catch (error) {
    console.error('[REDIS] Redis connection failed:', error.message);
  }
})();

module.exports = redis;
