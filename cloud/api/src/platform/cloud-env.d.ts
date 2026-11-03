import type { UnlockLockout } from "../viewer/unlock-lockout.js";
import type { RateLimiter } from "./rate-limiter.js";

declare global {
  namespace Cloudflare {
    interface Env {
      readonly AUTH_URL: string;
      readonly DB: D1Database;
      readonly FILES: R2Bucket;
      readonly PUB_COOKIE_KEY: string;
      readonly RATE: DurableObjectNamespace<RateLimiter>;
      readonly RP_ID: string;
      readonly UC_ORIGIN: string;
      readonly UNLOCK: DurableObjectNamespace<UnlockLockout>;
      readonly WEB_ORIGIN: string;
    }
  }
}
