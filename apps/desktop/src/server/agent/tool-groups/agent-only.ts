import type { McpSdkServerConfigWithInstance } from "@anthropic-ai/claude-agent-sdk";

import { buildAgentTools } from "../../agent-tools/registry.js";
import type { AgentTool } from "../../agent-tools/registry.js";
import { runActionCaller } from "../../mcp/registry.js";
import {
  HELP_INPUT,
  SCREENSHOT_TOOL,
  TARGET_TOOL,
} from "../canvas-tool-fields.js";
import { isLeanRun } from "../lean-run.js";
import { TOOL_SHORT } from "../tool-help.js";
import { HELP_TOOL, studioToolsFor } from "../tool-sets.js";
import {
  takeScreenshot,
  runRenderCheck,
  toDecodedRun,
  studioHelp,
} from "../tools.js";
import type {
  StudioToolCounters,
  StudioToolDeps,
  ToolFactory,
} from "../tools.js";
import { toDesignSystemTools } from "./design-system.js";
import { toDirectEditComponentTools } from "./direct-edit-component.js";
import { toDirectEditElementTools } from "./direct-edit-element.js";

const toAgentOnlyTools = (
  deps: StudioToolDeps,
  counters: StudioToolCounters,
  allowed: ReadonlySet<string>,
  tool: ToolFactory
): readonly object[] => [
  tool(
    "screenshot",
    TOOL_SHORT.screenshot,
    SCREENSHOT_TOOL.sdkFields,
    toDecodedRun(SCREENSHOT_TOOL.input, (args) =>
      takeScreenshot(deps, counters, args)
    ),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    "render_check",
    TOOL_SHORT.render_check,
    TARGET_TOOL.sdkFields,
    toDecodedRun(TARGET_TOOL.input, (args) =>
      runRenderCheck(deps, counters, args)
    ),
    { annotations: { readOnlyHint: true } }
  ),
  tool(
    HELP_TOOL,
    TOOL_SHORT.studio_help,
    HELP_INPUT.sdkFields,
    toDecodedRun(HELP_INPUT.input, (args) =>
      Promise.resolve({
        content: [
          { text: studioHelp(args.tool, allowed), type: "text" as const },
        ],
      })
    ),
    { annotations: { readOnlyHint: true } }
  ),
];

const ALWAYS_LOADED = new Set([
  "screenshot",
  "render_check",
  "design_review",
  "edit_element",
  "define_tweaks",
  HELP_TOOL,
]);

type ToolEntry = ReturnType<typeof toAgentOnlyTools>[number];

const isStudioTool = (entry: ToolEntry): entry is AgentTool =>
  "name" in entry && "handler" in entry;

const ALWAYS_LOAD_META = { "anthropic/alwaysLoad": true };

const toAllowedTools = (
  entry: ToolEntry,
  allowed: ReadonlySet<string>
): readonly AgentTool[] => {
  if (!isStudioTool(entry) || !allowed.has(entry.name)) {
    return [];
  }

  if (!ALWAYS_LOADED.has(entry.name)) {
    return [entry];
  }

  return [{ ...entry, _meta: ALWAYS_LOAD_META }];
};

const createStudioMcpServer = async (
  deps: StudioToolDeps
): Promise<McpSdkServerConfigWithInstance> => {
  const { createSdkMcpServer, tool } =
    await import("@anthropic-ai/claude-agent-sdk");

  const fresh: StudioToolCounters = { checks: 0, shots: 0 };

  if (deps.run) {
    deps.run.counters ??= fresh;
  }

  const counters = deps.run?.counters ?? fresh;

  const allowed = studioToolsFor(
    deps.ctx.project,
    deps.ctx.request.mode,
    deps.ctx.request.mode === "edit" && isLeanRun(deps.ctx.request)
  );

  const all = [
    ...toAgentOnlyTools(deps, counters, allowed, tool),
    ...toDirectEditElementTools(deps, tool),
    ...toDirectEditComponentTools(deps, tool),
    ...toDesignSystemTools(deps, tool),
    ...buildAgentTools(runActionCaller(deps), tool),
  ];

  return createSdkMcpServer({
    name: "studio",
    tools: all.flatMap((entry) => toAllowedTools(entry, allowed)),
    version: "0.1.0",
  });
};

export { createStudioMcpServer };
