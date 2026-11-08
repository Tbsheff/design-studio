import { Context, Effect, Layer } from "effect";

import { loadConfig } from "../../platform/config/index.js";
import type { AttentionResult } from "./attention-run.js";
import { readSavedAttention, toSavedPath } from "./attention-saved.js";
import type { SavedKey } from "./attention-saved.js";

type GetAttentionCommand = SavedKey;

interface AttentionStoreApi {
  readonly get: (
    command: GetAttentionCommand
  ) => Effect.Effect<AttentionResult | null>;
}

class AttentionStore extends Context.Service<
  AttentionStore,
  AttentionStoreApi
>()("design-studio/review/AttentionStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    AttentionStore,
    AttentionStore.of({
      get: Effect.fn("AttentionStore.get")(function* run(
        command: GetAttentionCommand
      ) {
        return yield* readSavedAttention(
          toSavedPath(loadConfig().dataDir, command)
        );
      }),
    })
  );
}

export { AttentionStore };

export type { AttentionStoreApi, GetAttentionCommand };
