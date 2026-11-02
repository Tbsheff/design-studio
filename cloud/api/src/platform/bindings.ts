import { env } from "cloudflare:workers";
import { ConfigProvider, Context, Layer } from "effect";

import type { RateLimiter } from "./rate-limiter.js";

type CloudEnv = Cloudflare.Env;

type AppEnv = Omit<CloudEnv, "DB" | "FILES" | "RATE">;

interface CloudBindingsApi {
  readonly db: D1Database;
  readonly files: R2Bucket;
  readonly rate: DurableObjectNamespace<RateLimiter>;
}

const cloudEnv: CloudEnv = env;

const toAppEnv = (source: CloudEnv): AppEnv => ({
  AUTH_URL: source.AUTH_URL,
  RP_ID: source.RP_ID,
  UC_ORIGIN: source.UC_ORIGIN,
  WEB_ORIGIN: source.WEB_ORIGIN,
});

const appEnv: AppEnv = toAppEnv(cloudEnv);

class CloudBindings extends Context.Service<CloudBindings, CloudBindingsApi>()(
  "design-studio/platform/CloudBindings"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    CloudBindings,
    CloudBindings.of({
      db: cloudEnv.DB,
      files: cloudEnv.FILES,
      rate: cloudEnv.RATE,
    })
  );
}

const configLayer = ConfigProvider.layer(ConfigProvider.fromUnknown(appEnv));

export { CloudBindings, appEnv, configLayer };

export type { AppEnv, CloudBindingsApi, CloudEnv };
