import { canvasList } from "../../canvas/tools.js";
import { defineTool, plain } from "../edit-kit.js";
import type { ToolSpec } from "../edit-kit.js";
import { FLOW_TOOLS } from "../flow-tools.js";
import { FRAME_STATE_TOOLS } from "../frame-state-tools.js";
import { LINK_TOOLS } from "../link-tools.js";
import { PAGE_IMPORT_TOOLS } from "../page-import-tools.js";
import {
  addFrame,
  addRouteFrame,
  busyCanvas,
  canvasContext,
  placeWithActivity,
  pointFrame,
  removeFrame,
} from "./canvas-frames.js";
import {
  addFrameSchema,
  addRouteFrameSchema,
  canvasListSchema,
  canvasPlaceSchema,
  canvasPointSchema,
  removeFrameSchema,
} from "./canvas-schema.js";

const canvasListTool = defineTool(
  "canvas_list",
  canvasListSchema,
  {
    description:
      "List the frames on the studio canvas of a project: id, label, page, size and position, plus what the user has selected and which frame is live.",
    idempotent: true,
    readOnly: true,
    title: "List canvas frames",
  },
  async (deps, input) => {
    const ctx = await canvasContext(deps, input);

    return plain(await canvasList(ctx));
  }
);

const canvasPlaceTool = defineTool(
  "canvas_place",
  canvasPlaceSchema,
  {
    description:
      "Add or move frames on the studio canvas. Pass { frames: [...] }, applied in order. Each item: frame (id or @label to move; leave out to add), label, path (a query string or #hash is dropped, with a warning), viewport or width/height, and one of below / rightOf / leftOf / above (another frame) with gap, or absolute x/y. Returns the placed frames and overlap warnings.",
    title: "Place canvas frames",
  },
  async (deps, input) => {
    const ctx = await busyCanvas(deps, input);

    return placeWithActivity(ctx, input.frames, "Placed");
  }
);

const canvasPointTool = defineTool(
  "canvas_point",
  canvasPointSchema,
  {
    description:
      "Show the user a small badge on the canvas that says you are pointing at one frame (and an optional CSS selector). The view moves only when the user clicks Show, so the result always has shown: false. badge: true means a studio window has the project open and the user sees the badge.",
    idempotent: true,
    readOnly: true,
    title: "Point at a canvas frame",
  },
  async (deps, input, client) => {
    const ctx = await canvasContext(deps, input);

    return plain(await pointFrame(deps, ctx, input, client));
  }
);

const addFrameTool = defineTool(
  "add_frame",
  addFrameSchema,
  {
    description:
      "Add a frame for a page or a state (path + viewport) to the canvas, to the right of all frames unless you pass rightOf or below.",
    title: "Add frame",
  },
  addFrame
);

const removeFrameTool = defineTool(
  "remove_frame",
  removeFrameSchema,
  {
    description: "Remove one frame from the canvas. The page file stays.",
    destructive: true,
    idempotent: true,
    title: "Remove frame",
  },
  removeFrame
);

const addRouteFrameTool = defineTool(
  "add_route_frame",
  addRouteFrameSchema,
  {
    description:
      "Add a canvas frame that shows one route of an attached app at a viewport. get_screenshot with the returned frame id renders it. On a canvas with no saved frames, the first route frame is f1 and replaces the default entry-page frame.",
    title: "Add route frame",
  },
  addRouteFrame
);

const CANVAS_LEGACY_TOOLS: ToolSpec[] = [
  canvasListTool,
  canvasPlaceTool,
  canvasPointTool,
  addFrameTool,
  removeFrameTool,
  addRouteFrameTool,
  ...LINK_TOOLS,
  ...PAGE_IMPORT_TOOLS,
  ...FLOW_TOOLS,
  ...FRAME_STATE_TOOLS,
];

export { CANVAS_LEGACY_TOOLS };
