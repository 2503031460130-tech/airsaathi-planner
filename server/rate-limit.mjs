/**
 * Factory creating an in-memory token bucket burst guard rate limiter.
 * Limits rapid consecutive requests per verified user key.
 *
 * @param {object} [options={}] - Rate limiter configuration
 * @param {() => number} [options.now] - Timestamp provider
 * @param {number} [options.limit=3] - Maximum requests allowed per window
 * @param {number} [options.windowMs=60000] - Sliding window duration in milliseconds
 * @param {number} [options.maxKeys=500] - Maximum keys tracked before automated eviction
 * @returns {(key?: string) => { allowed: boolean, remaining?: number, retryAfter?: number }}
 */
export function createRateLimit({
  now = () => Date.now(),
  limit = 3,
  windowMs = 60000,
  maxKeys = 500,
} = {}) {
  const buckets = new Map();
  return function take(key = "anonymous") {
    const at = now();
    let b = buckets.get(key);
    if (!b) {
      if (buckets.size >= maxKeys) {
        for (const [k, v] of buckets)
          if (at - v.opened >= windowMs || at < v.opened) buckets.delete(k);
        if (buckets.size >= maxKeys)
          return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
      }
      b = { opened: at, used: 0 };
      buckets.set(key, b);
    }
    if (at - b.opened >= windowMs || at < b.opened) {
      b.opened = at;
      b.used = 0;
    }
    if (b.used >= limit)
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((windowMs - at + b.opened) / 1000)),
      };
    b.used++;
    return { allowed: true, remaining: limit - b.used };
  };
}
