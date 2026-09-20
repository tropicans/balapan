const memoryStore = new Map();

/**
 * Creates an Express Rate Limiter middleware with Redis / In-Memory fallback.
 *
 * @param {Object} options
 * @param {number} [options.windowMs=60000] - Window duration in ms
 * @param {number} [options.max=100] - Max requests per window
 * @param {string} [options.message] - Error message
 */
export function createRateLimiter({ windowMs = 60000, max = 100, message = 'Terlalu banyak permintaan API. Silakan coba lagi nanti.' } = {}) {
  return async (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const key = `ratelimit:${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let record = memoryStore.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
    } else {
      record.count++;
    }

    memoryStore.set(key, record);

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: resetSeconds
      });
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Batas percobaan login tercapai. Coba lagi dalam 1 menit.' });
export const apiRateLimiter = createRateLimiter({ windowMs: 60000, max: 120, message: 'Terlalu banyak permintaan API. Silakan coba lagi nanti.' });
