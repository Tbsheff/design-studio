import { DurableObject } from "cloudflare:workers";

interface LockoutVerdict {
  readonly isLocked: boolean;
  readonly retryAfter: number;
}

const MAX_FAILURES = 10;

const LOCK_MS = 900_000;

const MS_PER_SECOND = 1000;

const FAILURES_KEY = "failures";

const UNTIL_KEY = "until";

class UnlockLockout extends DurableObject {
  public async check(): Promise<LockoutVerdict> {
    const until = (await this.ctx.storage.get<number>(UNTIL_KEY)) ?? 0;
    const now = Date.now();

    if (until > now) {
      return {
        isLocked: true,
        retryAfter: Math.ceil((until - now) / MS_PER_SECOND),
      };
    }

    return { isLocked: false, retryAfter: 0 };
  }

  public async fail(): Promise<LockoutVerdict> {
    const current = await this.check();

    if (current.isLocked) {
      return current;
    }

    const failures =
      ((await this.ctx.storage.get<number>(FAILURES_KEY)) ?? 0) + 1;

    if (failures >= MAX_FAILURES) {
      await this.ctx.storage.put(UNTIL_KEY, Date.now() + LOCK_MS);
      await this.ctx.storage.put(FAILURES_KEY, 0);

      return { isLocked: true, retryAfter: LOCK_MS / MS_PER_SECOND };
    }

    await this.ctx.storage.put(FAILURES_KEY, failures);

    return { isLocked: false, retryAfter: 0 };
  }

  public async clear(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}

export { UnlockLockout };

export type { LockoutVerdict };
