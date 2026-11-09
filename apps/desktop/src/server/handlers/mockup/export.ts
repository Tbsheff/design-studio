import type { Input } from "@design-studio/actions/_core/action";
import type { exportMockup } from "@design-studio/actions/mockup/export";
import { toDeviceFrame } from "@design-studio/contracts/device-frame";
import { Effect } from "effect";

import { MockupWriter } from "../../export/index.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type ExportMockupInput = Input<typeof exportMockup>;

const handle = Effect.fn("mockup.export")(function* run(
  input: ExportMockupInput
) {
  const reads = yield* McpReadStore;
  const writer = yield* MockupWriter;
  const spec = toDeviceFrame(input.device);

  const shot = yield* reads.screenshot({
    directionId: input.directionId,
    element: null,
    frameId: input.frameId,
    height: spec.screenHeight,
    isFullPage: false,
    padding: null,
    path: null,
    projectId: input.projectId,
    versionId: null,
    width: spec.screenWidth,
  });

  return yield* writer.export({
    device: input.device,
    frameId: input.frameId,
    pngBase64: shot.data,
    projectId: input.projectId,
    scheme: input.scheme,
  });
}) satisfies Handle<typeof exportMockup>;

export { handle };
