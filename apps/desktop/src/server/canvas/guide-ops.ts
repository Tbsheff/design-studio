import { cleanCanvasGuides } from "@design-studio/contracts/canvas-file";
import type { CanvasGuide } from "@design-studio/contracts/canvas-file";

import { getCanvasContext } from "./frame-ops.js";
import type { LinkRuntime } from "./links/link-runtime.js";

interface GuidesSetQuery {
  readonly guides: readonly CanvasGuide[];
  readonly projectId: string;
}

interface GuidesSet {
  readonly guides: readonly CanvasGuide[];
}

const setCanvasGuides = async (
  runtime: LinkRuntime,
  query: GuidesSetQuery
): Promise<GuidesSet> => {
  const context = await getCanvasContext(runtime, {
    directionId: null,
    projectId: query.projectId,
  });

  const guides = cleanCanvasGuides(
    query.guides.map((guide) => ({
      at: Math.round(guide.at),
      axis: guide.axis,
    }))
  );

  await context.canvas.update(
    context.project,
    (file) => ({ ...file, guides }),
    { source: "agent" }
  );

  return { guides };
};

export { setCanvasGuides };

export type { GuidesSet, GuidesSetQuery };
