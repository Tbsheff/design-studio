import type { Input } from "@design-studio/actions/_core/action";
import type { inspectStateFramesCanvas } from "@design-studio/actions/canvas/inspect-state-frames";
import { Effect } from "effect";

import { StateCheckStore, toStateLikeness } from "../../canvas/index.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type InspectStateFramesCanvasInput = Input<typeof inspectStateFramesCanvas>;

const handle = Effect.fn("canvas.inspectStateFrames")(function* run(
  input: InspectStateFramesCanvasInput
) {
  const checks = yield* StateCheckStore;
  const reads = yield* McpReadStore;

  const board = yield* checks.board({
    frame: input.frame,
    projectId: input.projectId,
  });

  const shot = {
    colorScheme: null,
    directionId: null,
    element: null,
    height: null,
    isFullPage: false,
    padding: null,
    path: null,
    projectId: input.projectId,
    versionId: null,
    width: null,
  };

  const base = yield* reads.screenshot({
    ...shot,
    frameId: board.base.frameId,
  });

  const items = [];

  for (const frame of board.states) {
    const view = yield* reads.screenshot({ ...shot, frameId: frame.frameId });
    const differsPct = yield* checks.diffPct(base.data, view.data);

    items.push({ ...frame, ...toStateLikeness(differsPct, input.threshold) });
  }

  return {
    items: [{ ...board.base, isSameAsDefault: false, similarity: 1 }, ...items],
    page: board.page,
  };
}) satisfies Handle<typeof inspectStateFramesCanvas>;

export { handle };
