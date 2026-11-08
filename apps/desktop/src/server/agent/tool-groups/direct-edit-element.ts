import { Schema } from "effect";

import { toOptional, toSdkFieldSet } from "../../agent-tools/index.js";
import {
  arrangeSdkFields,
  measureSdkFields,
  runArrange,
  runMeasure,
} from "../arrange-tool.js";
import {
  listBreakpointsInput,
  runListBreakpoints,
  runSetBreakpointStyle,
  setBreakpointStyleInput,
} from "../breakpoints-tool.js";
import { TWEAKS_TOOL } from "../canvas-tool-fields.js";
import { editElementFields, runEditElement } from "../direct-tools.js";
import { figmaImportSdkFields, runFigmaImport } from "../figma-import-tool.js";
import { runSetImage, setImageSdkFields } from "../image-tool.js";
import {
  getLayersSdkFields,
  runGetLayers,
  withLayerIds,
} from "../kit-tools.js";
import {
  LAYER_STATE_TOOL,
  LIST_LOCKS_TOOL,
  layerStateSdkFields,
  listLocksSdkFields,
  runListLockedLayers,
  runSetLayerState,
} from "../layer-state-tool.js";
import { runSelectMatching, selectMatchingSdkFields } from "../select-tool.js";
import {
  findStylesSdkFields,
  replaceStyleSdkFields,
  runFindStyles,
  runReplaceStyle,
} from "../style-tool.js";
import { TOOL_SHORT } from "../tool-help.js";
import { runDefineTweaks, toDecodedRun } from "../tools.js";
import type { StudioToolDeps, ToolFactory } from "../tools.js";
import {
  booleanOpsSdkFields,
  drawVectorSdkFields,
  paintVectorSdkFields,
  runBooleanOps,
  runDrawVector,
  runPaintVector,
} from "../vector-tool.js";

const StyleRecord = Schema.Record(
  Schema.String,
  Schema.Union([Schema.String, Schema.Finite, Schema.Null])
);

const agentEditElementSdkFields = toSdkFieldSet({
  ...editElementFields,
  style: toOptional(
    StyleRecord,
    "CSS properties to set, kebab-case or camelCase keys; null removes one. Tailwind projects get theme classes."
  ),
});

const toElementStyleTools = (
  deps: StudioToolDeps,
  tool: ToolFactory
): readonly object[] => [
  tool(
    "edit_element",
    TOOL_SHORT.edit_element,
    agentEditElementSdkFields,
    withLayerIds(deps, (args) => runEditElement(deps, args))
  ),
  tool(
    "find_styles",
    TOOL_SHORT.find_styles,
    findStylesSdkFields,
    (args) => runFindStyles(deps, args),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "replace_style",
    TOOL_SHORT.replace_style,
    replaceStyleSdkFields,
    (args) => runReplaceStyle(deps, args)
  ),
  tool("arrange", TOOL_SHORT.arrange, arrangeSdkFields, (args) =>
    runArrange(deps, args)
  ),
  tool(
    "select_matching",
    TOOL_SHORT.select_matching,
    selectMatchingSdkFields,
    (args) => runSelectMatching(deps, args),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "measure",
    TOOL_SHORT.measure,
    measureSdkFields,
    (args) => runMeasure(deps, args),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "list_breakpoints",
    TOOL_SHORT.list_breakpoints,
    listBreakpointsInput,
    withLayerIds(deps, (args) => runListBreakpoints(deps, args)),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "set_breakpoint_style",
    TOOL_SHORT.set_breakpoint_style,
    setBreakpointStyleInput,
    withLayerIds(deps, (args) => runSetBreakpointStyle(deps, args))
  ),
];

const toElementLayerTools = (
  deps: StudioToolDeps,
  tool: ToolFactory
): readonly object[] => [
  tool(
    "get_layers",
    TOOL_SHORT.get_layers,
    getLayersSdkFields,
    (args) => runGetLayers(deps, args),
    { annotations: { readOnlyHint: true } }
  ),
  tool("set_image", TOOL_SHORT.set_image, setImageSdkFields, (args) =>
    runSetImage(deps, args)
  ),
  tool("draw_vector", TOOL_SHORT.draw_vector, drawVectorSdkFields, (args) =>
    runDrawVector(deps, args)
  ),
  tool(
    "boolean_shapes",
    TOOL_SHORT.boolean_shapes,
    booleanOpsSdkFields,
    (args) => runBooleanOps(deps, args)
  ),
  tool("paint_shape", TOOL_SHORT.paint_shape, paintVectorSdkFields, (args) =>
    runPaintVector(deps, args)
  ),
  tool(
    LAYER_STATE_TOOL,
    TOOL_SHORT.set_layer_state,
    layerStateSdkFields,
    (args) => runSetLayerState(deps, args)
  ),
  tool(
    LIST_LOCKS_TOOL,
    TOOL_SHORT.list_locked_layers,
    listLocksSdkFields,
    (args) => runListLockedLayers(deps, args),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "import_figma_frame",
    TOOL_SHORT.import_figma_frame,
    figmaImportSdkFields,
    withLayerIds(deps, (args) => runFigmaImport(deps, args))
  ),
  tool(
    "define_tweaks",
    TOOL_SHORT.define_tweaks,
    TWEAKS_TOOL.sdkFields,
    toDecodedRun(TWEAKS_TOOL.input, (args) =>
      runDefineTweaks(deps, args.controls)
    )
  ),
];

const toDirectEditElementTools = (
  deps: StudioToolDeps,
  tool: ToolFactory
): readonly object[] => [
  ...toElementStyleTools(deps, tool),
  ...toElementLayerTools(deps, tool),
];

export { toDirectEditElementTools };
