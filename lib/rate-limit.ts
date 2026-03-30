import { headers } from "next/headers";

/**
 * In-process rate limiter using a module-level Map.
 *
 * Tradeoff: works correctly within a single Node.js process. On serverless
 * platforms (Vercel), each function instance has independent memory — the limit
 * applies per instance, not globally. For a small store with low cold-start
 * concurrency this is effective against typical spam. For full cross-instance
 * coordination, replace the Map with Upstash Redis + @upstash/ratelimit.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Prune expired entries periodically to prevent unbounded memory growth
let lastPrune = Date.now();
function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

/**
 * Returns true if the request is within the allowed rate, false if throttled.
 * key     — unique identifier, e.g. "subscribe:1.2.3.4"
 * limit   — max requests per window
 * windowMs — window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  maybePrune();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Extract the client IP from Next.js request headers.
 * Reads x-forwarded-for (set by Vercel/proxies) then x-real-ip as fallback.
 */
export async function clientIP(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
