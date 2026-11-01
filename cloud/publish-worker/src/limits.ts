import { sha256Hex } from "./crypto";
import { ApiError } from "./http";

export async function clientBucket(
  scope: string,
  client: string,
  keyHash: string
): Promise<string> {
  const day = new Date().toISOString().slice(0, 10);
  return `${scope}:${(await sha256Hex(`${keyHash}|${day}|${client}`)).slice(0, 24)}`;
}

export async function takeToken(
  db: D1Database,
  bucket: string,
  limit: number,
  windowMs: number,
  message: string
): Promise<void> {
  const now = Date.now();
  const start = now - (now % windowMs);
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT (bucket) DO UPDATE SET count = CASE WHEN window_start = ?2 THEN count + 1 ELSE 1 END, window_start = ?2
       RETURNING count`
    )
    .bind(bucket, start)
    .first<{ count: number }>();
  if ((row?.count ?? 0) > limit) {
    const retry = Math.ceil((start + windowMs - now) / 1000);
    throw new ApiError(429, "rate_limited", message, {
      "retry-after": String(retry),
    });
  }
}

export async function sweepLimits(db: D1Database): Promise<void> {
  await db
    .prepare("DELETE FROM rate_limits WHERE window_start < ?1")
    .bind(Date.now() - 86_400_000)
    .run();
}
