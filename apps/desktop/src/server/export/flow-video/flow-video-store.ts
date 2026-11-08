import { Context, Effect, Layer } from "effect";

import { attemptExport } from "../export-core.js";
import type { ExportError } from "../export-core.js";
import { runFlowRead } from "./flow-read.js";
import type { FlowReadRequest, FlowVideoFile } from "./flow-read.js";

interface FlowVideoStoreApi {
  readonly read: (
    request: FlowReadRequest
  ) => Effect.Effect<FlowVideoFile, ExportError>;
}

class FlowVideoStore extends Context.Service<
  FlowVideoStore,
  FlowVideoStoreApi
>()("design-studio/export/FlowVideoStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    FlowVideoStore,
    FlowVideoStore.of({
      read: Effect.fn("FlowVideoStore.read")(function* run(
        request: FlowReadRequest
      ) {
        return yield* attemptExport((runtime) => runFlowRead(runtime, request));
      }),
    })
  );
}

export { FlowVideoStore };

export type { FlowVideoStoreApi };
