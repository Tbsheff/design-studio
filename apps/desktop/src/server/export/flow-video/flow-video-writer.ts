import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import type { FlowVideoResult } from "@design-studio/actions/canvas/schema";
import { Context, Effect, Layer } from "effect";

import { toUnavailable } from "../../state-styles/index.js";
import { attemptExport } from "../export-core.js";
import type { ExportError } from "../export-core.js";
import type { FlowRequest } from "./flow-load.js";
import { runFlowVideo } from "./flow-run.js";

interface FlowVideoWriterApi {
  readonly export: (
    request: FlowRequest
  ) => Effect.Effect<FlowVideoResult, ExportError | Unavailable>;
}

class FlowVideoWriter extends Context.Service<
  FlowVideoWriter,
  FlowVideoWriterApi
>()("design-studio/export/FlowVideoWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    FlowVideoWriter,
    FlowVideoWriter.of({
      export: Effect.fn("FlowVideoWriter.export")(function* run(
        request: FlowRequest
      ) {
        return yield* attemptExport(
          (runtime) => runFlowVideo(runtime, request),
          toUnavailable
        );
      }),
    })
  );
}

export { FlowVideoWriter };

export type { FlowVideoWriterApi };
