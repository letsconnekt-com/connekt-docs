/**
 * Best-effort fixed-window rate limiter, kept in memory per server instance.
 *
 * Instances are reused across requests (Vercel Fluid Compute), so this stops casual abuse from one client.
 * It isn't shared across instances: pair it with a Vercel Firewall rate limit rule for a hard limit.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string): { ok: boolean; retryAfter: number } {
    const now = Date.now();

    // drop expired windows so the map can't grow without bound
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }

    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfter: 0 };
    }

    entry.count++;
    return { ok: entry.count <= limit, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  };
}

/** client IP from the proxy headers set by the hosting platform */
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}
