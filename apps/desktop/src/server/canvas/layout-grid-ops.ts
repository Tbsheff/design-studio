import type {
  CanvasFile,
  CanvasFileFrame,
} from "@design-studio/contracts/canvas-file";
import type { CanvasLayoutGrid } from "@design-studio/contracts/layout-grid";

import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import { toLayoutGridFit } from "./engine/to-layout-grid.js";
import { getWritableContext } from "./frame-ops.js";
import type { FrameTarget } from "./frame-ops.js";
import type { LinkRuntime } from "./links/link-runtime.js";
import { findFrame } from "./tools.js";

interface LayoutGridQuery extends FrameTarget {
  readonly frame: string;
  readonly layoutGrid: CanvasLayoutGrid | null;
}

interface LayoutGridSet {
  readonly frameId: string;
  readonly layoutGrid: CanvasLayoutGrid | null;
  readonly note: string;
}

interface GridPlan {
  readonly file: CanvasFile;
  readonly frame: CanvasFileFrame;
}

const toGridFrame = (
  frame: CanvasFileFrame,
  grid: CanvasLayoutGrid | null
): CanvasFileFrame => {
  const rest = { ...frame };

  delete rest.layoutGrid;

  if (grid === null) {
    return rest;
  }

  const fit = toLayoutGridFit(grid, frame.width);

  if (!fit.ok) {
    throw new BadRequestError(
      `The grid does not fit in the ${frame.width} px frame. Use fewer columns, a smaller gutter or a smaller margin.`
    );
  }

  return { ...rest, layoutGrid: fit.value };
};

const toGridFile = (file: CanvasFile, query: LayoutGridQuery): GridPlan => {
  const found = findFrame(file.frames, query.frame);

  if (!found) {
    throw new NotFoundError(
      `No frame ${query.frame}. Call canvas_list for the ids and labels.`
    );
  }

  const frame = toGridFrame(found, query.layoutGrid);

  return {
    file: {
      ...file,
      frames: file.frames.map((item) => {
        if (item.id === frame.id) {
          return frame;
        }

        return item;
      }),
    },
    frame,
  };
};

const setCanvasLayoutGrid = async (
  runtime: LinkRuntime,
  query: LayoutGridQuery
): Promise<LayoutGridSet> => {
  const context = await getWritableContext(runtime, query);
  const made = { frame: null as CanvasFileFrame | null };

  await context.canvas.update(
    context.project,
    (file) => {
      const plan = toGridFile(file, query);

      made.frame = plan.frame;

      return plan.file;
    },
    { source: "agent" }
  );

  if (made.frame === null) {
    throw new BadRequestError("The layout grid was not written.");
  }

  return {
    frameId: made.frame.id,
    layoutGrid: made.frame.layoutGrid ?? null,
    note: "Undo restores the earlier grid.",
  };
};

export { setCanvasLayoutGrid };

export type { LayoutGridQuery, LayoutGridSet };
