import type { MockupExportResult } from "@design-studio/actions/mockup/schema";
import { Context, Effect, Layer } from "effect";

import { attemptExport } from "../export-core.js";
import type { ExportError } from "../export-core.js";
import { runMockupExport } from "./mockup-run.js";
import type { MockupRequest } from "./mockup-run.js";

interface MockupWriterApi {
  readonly export: (
    request: MockupRequest
  ) => Effect.Effect<MockupExportResult, ExportError>;
}

class MockupWriter extends Context.Service<MockupWriter, MockupWriterApi>()(
  "design-studio/export/MockupWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    MockupWriter,
    MockupWriter.of({
      export: Effect.fn("MockupWriter.export")(function* run(
        request: MockupRequest
      ) {
        return yield* attemptExport((runtime) =>
          runMockupExport(runtime, request)
        );
      }),
    })
  );
}

export { MockupWriter };

export type { MockupWriterApi };
