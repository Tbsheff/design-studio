import type { RateLimiter } from "./rate-limiter.js";

declare global {
  namespace Cloudflare {
    interface Env {
      readonly AUTH_URL: string;
      readonly DB: D1Database;
      readonly FILES: R2Bucket;
      readonly RATE: DurableObjectNamespace<RateLimiter>;
      readonly RP_ID: string;
      readonly UC_ORIGIN: string;
      readonly WEB_ORIGIN: string;
    }
  }
}
