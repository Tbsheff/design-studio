import {
  FLOW_TOOL,
  canvasPlaceInput,
  canvasPointInput,
  editLinksInput,
  frameSessionInput,
  frameStateInput,
  routeLinkInput,
} from "../canvas-tool-fields.js";
import { TOOL_SHORT } from "../tool-help.js";
import {
  runCanvasList,
  runCanvasPlace,
  runCanvasPoint,
  runListLinks,
  runEditLinks,
  runListFrameStates,
  runSetFrameState,
  runSetFrameSession,
  runListRouteLinks,
  runAddFlow,
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
  tool("list_links", TOOL_SHORT.list_links, {}, () => runListLinks(deps), {
    annotations: { readOnlyHint: true },
  }),
  tool(
    "edit_links",
    TOOL_SHORT.edit_links,
    editLinksInput.sdkFields,
    toDecodedRun(editLinksInput.input, (args) => runEditLinks(deps, args))
  ),
  tool(
    "list_frame_states",
    TOOL_SHORT.list_frame_states,
    {},
    () => runListFrameStates(deps),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "set_frame_state",
    TOOL_SHORT.set_frame_state,
    frameStateInput.sdkFields,
    toDecodedRun(frameStateInput.input, (args) => runSetFrameState(deps, args))
  ),
  tool(
    "set_frame_session",
    TOOL_SHORT.set_frame_session,
    frameSessionInput.sdkFields,
    toDecodedRun(frameSessionInput.input, (args) =>
      runSetFrameSession(deps, args)
    )
  ),
  tool(
    "list_route_links",
    TOOL_SHORT.list_route_links,
    routeLinkInput.sdkFields,
    toDecodedRun(routeLinkInput.input, (args) =>
      runListRouteLinks(deps, args.route)
    ),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "add_flow",
    TOOL_SHORT.add_flow,
    FLOW_TOOL.sdkFields,
    toDecodedRun(FLOW_TOOL.input, (args) => runAddFlow(deps, args))
  ),
];

export { toCanvasTools };
