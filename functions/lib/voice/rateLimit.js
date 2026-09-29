"use strict";
/**
 * In-memory sliding window rate limiter for Firebase Cloud Functions
 * Protects Google Cloud Speech-to-Text and ElevenLabs APIs from abuse.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
const rateLimitStore = new Map();
// Clean up stale records periodically (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
        if (record.timestamps.length === 0) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);
/**
 * Check if a client has exceeded their rate limit.
 * @param identifier User UID or client IP
 * @param maxPerMinute Maximum allowed requests per 60 seconds
 * @returns { allowed: boolean, remaining: number, resetMs: number }
 */
function checkRateLimit(identifier, maxPerMinute = 30) {
    const now = Date.now();
    let record = rateLimitStore.get(identifier);
    if (!record) {
        record = { timestamps: [] };
        rateLimitStore.set(identifier, record);
    }
    // Filter timestamps within the last 60 seconds
    record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
    if (record.timestamps.length >= maxPerMinute) {
        const oldest = record.timestamps[0];
        const resetMs = Math.max(0, 60000 - (now - oldest));
        return {
            allowed: false,
            remaining: 0,
            resetMs,
        };
    }
    record.timestamps.push(now);
    return {
        allowed: true,
        remaining: maxPerMinute - record.timestamps.length,
        resetMs: 60000,
    };
}
//# sourceMappingURL=rateLimit.js.map