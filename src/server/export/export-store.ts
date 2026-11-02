import { Context, Effect, Layer } from "effect";

import type { CopyCodeResult } from "../../shared/actions/export/schema.js";
import { readCode } from "./copy-target.js";
import type { CopyQuery } from "./copy-target.js";
import { attemptExport } from "./export-core.js";
import type { ExportError } from "./export-core.js";

interface ExportStoreApi {
  readonly code: (
    query: CopyQuery
  ) => Effect.Effect<CopyCodeResult, ExportError>;
}

class ExportStore extends Context.Service<ExportStore, ExportStoreApi>()(
  "design-studio/export/ExportStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ExportStore,
    ExportStore.of({
      code: Effect.fn("ExportStore.code")(function* run(query: CopyQuery) {
        return yield* attemptExport((runtime) => readCode(runtime, query));
      }),
    })
  );
}

export { ExportStore };

export type { ExportStoreApi };
