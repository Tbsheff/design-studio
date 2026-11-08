import path from "node:path";

import { Context, Effect, Layer, Schema } from "effect";

import { REPO_ROOT, loadConfig } from "../platform/config/index.js";
import { toJsonFileReader } from "../platform/local-file/index.js";

interface StudioInfoApi {
  readonly previewOrigin: string;
  readonly version: string;
}

const UNKNOWN_VERSION = "0.0.0";

const PackageSchema = Schema.Struct({ version: Schema.String });

const readPackage = toJsonFileReader(PackageSchema);

const readVersion = Effect.fn("StudioInfo.readVersion")(function* run() {
  const parsed = yield* readPackage(path.join(REPO_ROOT, "package.json"));

  if (parsed === null) {
    return UNKNOWN_VERSION;
  }

  return parsed.version;
});

class StudioInfo extends Context.Service<StudioInfo, StudioInfoApi>()(
  "design-studio/store/StudioInfo"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    StudioInfo,
    Effect.gen(function* build() {
      const version = yield* readVersion().pipe(
        Effect.catchCause(() => Effect.succeed(UNKNOWN_VERSION))
      );

      return StudioInfo.of({
        previewOrigin: loadConfig().previewOrigin,
        version,
      });
    })
  );
}

export { StudioInfo };

export type { StudioInfoApi };
