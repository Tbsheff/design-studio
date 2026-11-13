import type { CanvasGuide } from "@design-studio/contracts/canvas-file";

import { getCanvasContext } from "./frame-ops.js";
import type { FrameTarget } from "./frame-ops.js";
import type { LinkRuntime } from "./links/link-runtime.js";
import { inspectCanvasListing } from "./tools.js";
import type { CanvasListing } from "./tools.js";

interface GuidedListing extends CanvasListing {
  readonly guides: readonly CanvasGuide[];
}

const inspectGuidedListing = async (
  runtime: LinkRuntime,
  target: FrameTarget
): Promise<GuidedListing> => {
  const context = await getCanvasContext(runtime, target);

  const [listing, { canvas }] = await Promise.all([
    inspectCanvasListing(context),
    context.canvas.read(context.project),
  ]);

  return { ...listing, guides: canvas?.guides ?? [] };
};

export { inspectGuidedListing };

export type { GuidedListing };
