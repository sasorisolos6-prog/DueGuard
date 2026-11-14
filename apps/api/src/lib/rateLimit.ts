export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  db: D1Database,
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);

  try {
    const row = await db
      .prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?')
      .bind(key)
      .first<{ count: number; reset_at: number }>();

    if (!row || row.reset_at <= now) {
      const resetAt = now + windowSeconds;
      await db
        .prepare(
          `INSERT INTO rate_limits (key, count, reset_at)
           VALUES (?, 1, ?)
           ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at`
        )
        .bind(key, resetAt)
        .run();
      return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
    }

    if (row.count >= maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, row.reset_at - now),
      };
    }

    await db
      .prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')
      .bind(key)
      .run();

    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - (row.count + 1)),
      retryAfterSeconds: 0,
    };
  } catch (err) {
    // If rate_limits table does not exist yet (e.g. before migration), fail-open gracefully with warning
    console.warn('Rate limiting query error (ensure migration 0004 is applied):', err);
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }
}
