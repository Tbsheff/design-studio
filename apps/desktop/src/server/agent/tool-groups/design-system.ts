import { runSetToken, setTokenSdkFields } from "../direct-tools.js";
import { TOOL_SHORT } from "../tool-help.js";
import { runDesignSystemCheck } from "../tools.js";
import type { StudioToolDeps, ToolFactory } from "../tools.js";

const toDesignSystemTools = (
  deps: StudioToolDeps,
  tool: ToolFactory
): readonly object[] => [
  tool("set_token", TOOL_SHORT.set_token, setTokenSdkFields, (args) =>
    runSetToken(deps, args)
  ),
  tool(
    "design_system_check",
    TOOL_SHORT.design_system_check,
    {},
    () => runDesignSystemCheck(deps),
    { annotations: { readOnlyHint: true } }
  ),
];

export { toDesignSystemTools };
