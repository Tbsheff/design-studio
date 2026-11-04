import { Context, Effect, Layer } from "effect";

import { RateLimited } from "@design-studio/actions/_core/errors/rate-limited";
import { CloudBindings } from "../platform/bindings.js";
import type { RateLimiter, RateVerdict } from "../platform/rate-limiter.js";

interface RateRule {
  readonly limit: number;
  readonly windowMs: number;
}

interface RateClient {
  readonly hit: (key: string, rule: RateRule) => Promise<RateVerdict>;
}

interface AuthRateLimitApi {
  readonly check: (
    key: string,
    rule: RateRule
  ) => Effect.Effect<void, RateLimited>;
}

const MINUTE_MS = 60_000;

const AUTH_RULES = {
  apiKey: { limit: 600, windowMs: MINUTE_MS },
  device: { limit: 10, windowMs: MINUTE_MS },
  signIn: { limit: 10, windowMs: MINUTE_MS },
  signUp: { limit: 5, windowMs: MINUTE_MS },
  verify: { limit: 5, windowMs: MINUTE_MS },
} as const satisfies Readonly<Record<string, RateRule>>;

const toRateClient = (
  namespace: DurableObjectNamespace<RateLimiter>
): RateClient => ({
  hit: async (key, rule) => {
    const stub = namespace.get(namespace.idFromName(key));

    return await stub.hit(key, rule.limit, rule.windowMs);
  },
});

class AuthRateLimit extends Context.Service<AuthRateLimit, AuthRateLimitApi>()(
  "design-studio/auth/AuthRateLimit"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    AuthRateLimit,
    Effect.gen(function* make() {
      const bindings = yield* CloudBindings;
      const client = toRateClient(bindings.rate);

      const check = Effect.fn("AuthRateLimit.check")(function* run(
        key: string,
        rule: RateRule
      ) {
        const verdict = yield* Effect.promise(() => client.hit(key, rule));

        if (verdict.isAllowed) {
          return;
        }

        return yield* new RateLimited({
          message: "Too many requests. Wait, then try again.",
          retryAfter: verdict.retryAfter,
        });
      });

      return AuthRateLimit.of({ check });
    })
  );
}

export { AUTH_RULES, AuthRateLimit, toRateClient };

export type { AuthRateLimitApi, RateClient, RateRule };
