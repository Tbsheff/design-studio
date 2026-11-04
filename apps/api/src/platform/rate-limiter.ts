import { DurableObject } from "cloudflare:workers";

interface RateVerdict {
  readonly isAllowed: boolean;
  readonly retryAfter: number;
}

interface WindowRow {
  readonly count: number;
  readonly started: number;
  readonly [column: string]: SqlStorageValue;
}

const MS_PER_SECOND = 1000;

const CREATE_TABLE =
  "CREATE TABLE IF NOT EXISTS rate_window (key TEXT PRIMARY KEY, started INTEGER NOT NULL, count INTEGER NOT NULL)";

const toRetryAfter = (started: number, windowMs: number, now: number): number =>
  Math.max(1, Math.ceil((started + windowMs - now) / MS_PER_SECOND));

class RateLimiter extends DurableObject {
  public hit(key: string, limit: number, windowMs: number): RateVerdict {
    const { sql } = this.ctx.storage;

    sql.exec(CREATE_TABLE);

    const now = Date.now();

    const rows = sql
      .exec<WindowRow>(
        "SELECT started, count FROM rate_window WHERE key = ?",
        key
      )
      .toArray();

    const row = rows.at(0) ?? null;

    if (row === null || now - row.started >= windowMs) {
      sql.exec(
        "INSERT OR REPLACE INTO rate_window (key, started, count) VALUES (?, ?, 1)",
        key,
        now
      );

      return { isAllowed: true, retryAfter: 0 };
    }

    if (row.count >= limit) {
      return {
        isAllowed: false,
        retryAfter: toRetryAfter(row.started, windowMs, now),
      };
    }

    sql.exec("UPDATE rate_window SET count = count + 1 WHERE key = ?", key);

    return { isAllowed: true, retryAfter: 0 };
  }
}

export { RateLimiter };

export type { RateVerdict };
