import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import type { PageImportResult } from "./deps.js";
import { runPageImport } from "./page-run.js";
import type { ImportPageCommand } from "./page-run.js";

interface PageWriterApi {
  readonly import: (
    command: ImportPageCommand
  ) => Effect.Effect<PageImportResult, KnownFailure>;
}

class PageWriter extends Context.Service<PageWriter, PageWriterApi>()(
  "design-studio/page-import/PageWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    PageWriter,
    PageWriter.of({
      import: Effect.fn("PageWriter.import")(function* run(
        command: ImportPageCommand
      ) {
        return yield* runPageImport(command);
      }),
    })
  );
}

export { PageWriter };

export type { PageWriterApi };
