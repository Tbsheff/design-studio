import { canvasPlaceInput, canvasPointInput } from "../canvas-tool-fields.js";
import { TOOL_SHORT } from "../tool-help.js";
import {
  runCanvasList,
  runCanvasPlace,
  runCanvasPoint,
  toDecodedRun,
} from "../tools.js";
import type { StudioToolDeps, ToolFactory } from "../tools.js";

const toCanvasTools = (
  deps: StudioToolDeps,
  tool: ToolFactory
): readonly object[] => [
  tool("canvas_list", TOOL_SHORT.canvas_list, {}, () => runCanvasList(deps), {
    annotations: { readOnlyHint: true },
  }),
  tool(
    "canvas_place",
    TOOL_SHORT.canvas_place,
    canvasPlaceInput.sdkFields,
    toDecodedRun(canvasPlaceInput.input, (args) =>
      runCanvasPlace(deps, args.frames)
    )
  ),
  tool(
    "canvas_point",
    TOOL_SHORT.canvas_point,
    canvasPointInput.sdkFields,
    toDecodedRun(canvasPointInput.input, (args) => runCanvasPoint(deps, args)),
    { annotations: { readOnlyHint: true } }
  ),
];

export { toCanvasTools };
