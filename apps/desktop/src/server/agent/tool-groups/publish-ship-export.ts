import { copyCodeInput, runCopyCode } from "../copy-code-tool.js";
import { exportFrameSdkFields, runExportFrame } from "../export-tool.js";
import { withLayerIds } from "../kit-tools.js";
import { TOOL_SHORT } from "../tool-help.js";
import { runPrepareShip } from "../tools.js";
import type { StudioToolDeps, ToolFactory } from "../tools.js";

const toPublishShipExportTools = (
  deps: StudioToolDeps,
  tool: ToolFactory
): readonly object[] => [
  tool(
    "prepare_ship",
    TOOL_SHORT.prepare_ship,
    {},
    () => runPrepareShip(deps),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "copy_code",
    TOOL_SHORT.copy_code,
    copyCodeInput,
    withLayerIds(deps, (args) => runCopyCode(deps, args)),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "export_frame",
    TOOL_SHORT.export_frame,
    exportFrameSdkFields,
    withLayerIds(deps, (args) => runExportFrame(deps, args))
  ),
];

export { toPublishShipExportTools };
