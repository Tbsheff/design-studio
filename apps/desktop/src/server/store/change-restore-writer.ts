import type { RestoredChange } from "@design-studio/actions/version/changes/schema";
import { Context, Effect, Layer } from "effect";

import { restoreLayerChange } from "./change-restore.js";
import type { ChangeRestoreQuery } from "./change-restore.js";
import { attemptVersionWrite } from "./version-write-core.js";
import type { VersionWriteError } from "./version-write-core.js";

interface ChangeRestoreWriterApi {
  readonly restore: (
    query: ChangeRestoreQuery
  ) => Effect.Effect<RestoredChange, VersionWriteError>;
}

class ChangeRestoreWriter extends Context.Service<
  ChangeRestoreWriter,
  ChangeRestoreWriterApi
>()("design-studio/store/ChangeRestoreWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ChangeRestoreWriter,
    ChangeRestoreWriter.of({
      restore: Effect.fn("ChangeRestoreWriter.restore")(function* run(
        query: ChangeRestoreQuery
      ) {
        return yield* attemptVersionWrite((runtime) =>
          restoreLayerChange(runtime, query)
        );
      }),
    })
  );
}

export { ChangeRestoreWriter };

export type { ChangeRestoreWriterApi };
