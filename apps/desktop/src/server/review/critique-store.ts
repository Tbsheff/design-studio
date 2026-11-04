import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { loadConfig } from "../platform/config/index.js";
import type { Critique } from "./critique-frame.js";
import { readSavedCritique, toSavedPath } from "./critique-saved.js";

interface GetCommand {
  readonly directionId: string;
  readonly frameId: string;
  readonly projectId: string;
}

interface CritiqueStoreApi {
  readonly get: (command: GetCommand) => Effect.Effect<Critique, NotFound>;
}

class CritiqueStore extends Context.Service<CritiqueStore, CritiqueStoreApi>()(
  "design-studio/review/CritiqueStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    CritiqueStore,
    CritiqueStore.of({
      get: Effect.fn("CritiqueStore.get")(function* run(command: GetCommand) {
        const saved = yield* readSavedCritique(
          toSavedPath(loadConfig().dataDir, command)
        );

        if (saved === null) {
          return yield* new NotFound({
            message: `No critique is saved for frame ${command.frameId}. Run run_critique first.`,
          });
        }

        return saved.result;
      }),
    })
  );
}

export { CritiqueStore };

export type { CritiqueStoreApi, GetCommand };
