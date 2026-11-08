import {
  reviewFrameSdkFields,
  runReviewFrameTool,
} from "../../review/agent-tool.js";
import { TARGET_TOOL } from "../canvas-tool-fields.js";
import {
  createComponentSdkFields,
  runCreateComponent,
  runSwapInstance,
  swapInstanceSdkFields,
} from "../component-create-tool.js";
import {
  insertComponentSdkFields,
  runInsertComponent,
} from "../insert-tool.js";
import { withLayerIds } from "../kit-tools.js";
import { runSetProps, setPropsSdkFields } from "../props-tool.js";
import { TOOL_SHORT } from "../tool-help.js";
import { runDesignReview, toDecodedRun } from "../tools.js";
import type { StudioToolDeps, ToolFactory } from "../tools.js";

const toDirectEditComponentTools = (
  deps: StudioToolDeps,
  tool: ToolFactory
): readonly object[] => [
  tool(
    "set_props",
    TOOL_SHORT.set_props,
    setPropsSdkFields,
    withLayerIds(deps, (args) => runSetProps(deps, args))
  ),
  tool(
    "review_frame",
    TOOL_SHORT.review_frame,
    reviewFrameSdkFields,
    withLayerIds(deps, (args) => runReviewFrameTool(deps, args)),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "insert_component",
    TOOL_SHORT.insert_component,
    insertComponentSdkFields,
    withLayerIds(deps, (args) => runInsertComponent(deps, args))
  ),
  tool(
    "create_component",
    TOOL_SHORT.create_component,
    createComponentSdkFields,
    (args) => runCreateComponent(deps, args)
  ),
  tool(
    "swap_instance",
    TOOL_SHORT.swap_instance,
    swapInstanceSdkFields,
    withLayerIds(deps, (args) => runSwapInstance(deps, args))
  ),
  tool(
    "design_review",
    TOOL_SHORT.design_review,
    TARGET_TOOL.sdkFields,
    toDecodedRun(TARGET_TOOL.input, (args) => runDesignReview(deps, args)),
    { annotations: { readOnlyHint: true } }
  ),
];

export { toDirectEditComponentTools };
