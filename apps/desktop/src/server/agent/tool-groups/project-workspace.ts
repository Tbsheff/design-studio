import { doctorInput } from "../canvas-tool-fields.js";
import { getRunContextSdkFields, runGetRunContext } from "../context-tool.js";
import { runAppDoctor } from "../doctor-tool.js";
import { TOOL_SHORT } from "../tool-help.js";
import { toDecodedRun } from "../tools.js";
import type { StudioToolDeps, ToolFactory } from "../tools.js";

const toProjectWorkspaceTools = (
  deps: StudioToolDeps,
  tool: ToolFactory
): readonly object[] => [
  tool(
    "get_run_context",
    TOOL_SHORT.get_run_context,
    getRunContextSdkFields,
    () => runGetRunContext(deps),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "app_doctor",
    TOOL_SHORT.app_doctor,
    doctorInput.sdkFields,
    toDecodedRun(doctorInput.input, (args) =>
      runAppDoctor(deps, args.fresh === true)
    ),
    { annotations: { readOnlyHint: true } }
  ),
];

export { toProjectWorkspaceTools };
