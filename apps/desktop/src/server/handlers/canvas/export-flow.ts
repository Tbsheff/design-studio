import type { Input } from "@design-studio/actions/_core/action";
import type { exportFlowCanvas } from "@design-studio/actions/canvas/export-flow";
import { Effect } from "effect";

import { FlowVideoWriter } from "../../export/index.js";
import type { Handle } from "../_core/handler.js";

type ExportFlowCanvasInput = Input<typeof exportFlowCanvas>;

const handle = Effect.fn("canvas.exportFlow")(function* run(
  input: ExportFlowCanvasInput
) {
  const writer = yield* FlowVideoWriter;

  return yield* writer.export(input);
}) satisfies Handle<typeof exportFlowCanvas>;

export { handle };
