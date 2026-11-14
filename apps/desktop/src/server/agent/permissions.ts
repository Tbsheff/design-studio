import path from "node:path";

import type {
  CanUseTool,
  HookCallback,
  PermissionResult,
} from "@anthropic-ai/claude-agent-sdk";

import type { AgentRunContext } from "../../shared/server-ports.js";
import { SOURCE_DIR } from "../design-system/extract/draft.js";
import { isPathLocked } from "../platform/path-lock/index.js";
import {
  READ_TOOLS,
  SKILL_TOOL,
  TODO_TOOL,
  TOOL_SEARCH_TOOL,
  bashWriteProblem,
  evaluateToolUse,
  setToolCatalog,
  toIntegrationAccess,
} from "../platform/tool-policy/index.js";
import type { ToolPolicy } from "../platform/tool-policy/index.js";
import type { ToolGate } from "./ask-gate.js";
import {
  FOCUS_PATH_MESSAGE,
  isOutsideFocus,
  toGateLists,
} from "./focus-gate.js";
import { AGENT_OPS } from "./legacy/agent-ops.js";
import { LEGACY_AGENT_TOOLS } from "./legacy/all.js";
import {
  ADD_FLOW_TOOL,
  ADD_LINK_TOOL,
  CANVAS_LIST_TOOL,
  CANVAS_PLACE_TOOL,
  CANVAS_POINT_TOOL,
  KEEP_LINKS_TOOL,
  LIST_FRAME_STATES_TOOL,
  LIST_LINKS_TOOL,
  LIST_ROUTE_LINKS_TOOL,
  REMOVE_LINK_TOOL,
  SET_FRAME_SESSION_TOOL,
  SET_FRAME_STATE_TOOL,
  SET_START_FRAME_TOOL,
  UPDATE_LINK_TOOL,
} from "./legacy/canvas.js";
import {
  ARRANGE_TOOL,
  CREATE_COMPONENT_TOOL,
  EDIT_ELEMENT_TOOL,
  GET_LAYERS_TOOL,
  INSERT_COMPONENT_TOOL,
  LIST_LOCKS_MCP,
  REPLACE_STYLE_TOOL,
  REVIEW_FRAME_TOOL,
  SELECT_MATCHING_TOOL,
  SET_IMAGE_TOOL,
  SET_PROPS_TOOL,
  STUDIO_EDIT_TOOLS_R13,
  SWAP_INSTANCE_TOOL,
} from "./legacy/direct-edit.js";
import { EXPORT_FRAME_TOOL } from "./legacy/export.js";
import { DESIGN_SYSTEM_CHECK_TOOL } from "./legacy/packs.js";
import { STUDIO_HELP_TOOL } from "./legacy/studio.js";

export {
  ADD_FLOW_TOOL,
  ADD_LINK_TOOL,
  CANVAS_LIST_TOOL,
  CANVAS_PLACE_TOOL,
  CANVAS_POINT_TOOL,
  KEEP_LINKS_TOOL,
  LIST_FRAME_STATES_TOOL,
  LIST_LINKS_TOOL,
  LIST_ROUTE_LINKS_TOOL,
  REMOVE_LINK_TOOL,
  SET_FRAME_SESSION_TOOL,
  SET_FRAME_STATE_TOOL,
  SET_START_FRAME_TOOL,
  UPDATE_LINK_TOOL,
} from "./legacy/canvas.js";

export {
  ARRANGE_TOOL,
  CREATE_COMPONENT_TOOL,
  EDIT_ELEMENT_TOOL,
  FIND_STYLES_TOOL,
  GET_LAYERS_TOOL,
  INSERT_COMPONENT_TOOL,
  MEASURE_TOOL,
  REPLACE_STYLE_TOOL,
  REVIEW_FRAME_TOOL,
  SELECT_MATCHING_TOOL,
  SET_IMAGE_TOOL,
  SET_PROPS_TOOL,
  SWAP_INSTANCE_TOOL,
} from "./legacy/direct-edit.js";

export { EXPORT_FRAME_TOOL } from "./legacy/export.js";

export { DESIGN_SYSTEM_CHECK_TOOL } from "./legacy/packs.js";

export { STUDIO_HELP_TOOL } from "./legacy/studio.js";

export {
  GENERATED_TOKENS_MESSAGE,
  PLAN_MODE_DENY,
  STUDIO_DIR_MESSAGE,
  bashWriteProblem,
  blockedInCritique,
  builtinToolNames,
  evaluateToolUse,
  isExecutedConfigFile,
  isInstallCommand,
  isSecretFile,
  permittedToolNames,
} from "../platform/tool-policy/index.js";

export type { ToolPolicy } from "../platform/tool-policy/index.js";

export const holdsUntrustedInput = (request: {
  readonly comments?: readonly unknown[];
}): boolean => (request.comments?.length ?? 0) > 0;

export const withUntrustedLimits = (
  policy: ToolPolicy,
  request: { readonly comments?: readonly unknown[] }
): ToolPolicy => {
  if (holdsUntrustedInput(request)) {
    return { ...policy, allowBash: false, allowInstall: false };
  }

  return policy;
};

const LOCKED_PATH_MESSAGE =
  "This file is locked. Unlock it in Code to let Claude change it.";

const LOCK_PATH_FIELDS = ["file_path", "notebook_path", "path"] as const;

const LOCKED_WRITE_TOOLS = new Set([
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
]);

const toWorkTreePath = (workTree: string, file: string): string =>
  path
    .relative(workTree, path.resolve(workTree, file))
    .split(path.sep)
    .join("/");

const isLockedWrite = (
  policy: ToolPolicy,
  toolName: string,
  input: Record<string, unknown>
): boolean => {
  if (!LOCKED_WRITE_TOOLS.has(toolName)) {
    return false;
  }

  const globs = policy.lockedPaths ?? [];

  return LOCK_PATH_FIELDS.some((field) => {
    const value = input[field];

    return (
      typeof value === "string" &&
      value !== "" &&
      isPathLocked(globs, toWorkTreePath(policy.workTree, value))
    );
  });
};

const isFocusBlockedWrite = (
  policy: ToolPolicy,
  toolName: string,
  input: Record<string, unknown>
): boolean => {
  const globs = policy.focusPaths ?? [];

  if (globs.length === 0 || !LOCKED_WRITE_TOOLS.has(toolName)) {
    return false;
  }

  return LOCK_PATH_FIELDS.some((field) => {
    const value = input[field];

    return (
      typeof value === "string" &&
      value !== "" &&
      isOutsideFocus(globs, toWorkTreePath(policy.workTree, value))
    );
  });
};

const toLockedResult = (
  policy: ToolPolicy,
  toolName: string,
  input: Record<string, unknown>
): PermissionResult => {
  if (isLockedWrite(policy, toolName, input)) {
    return { behavior: "deny", message: LOCKED_PATH_MESSAGE };
  }

  if (isFocusBlockedWrite(policy, toolName, input)) {
    return { behavior: "deny", message: FOCUS_PATH_MESSAGE };
  }

  return evaluateToolUse(policy, toolName, input);
};

const toBashWriteProblem = (
  policy: Pick<
    ToolPolicy,
    "allowInstall" | "focusPaths" | "lockedPaths" | "readOnlyDirs" | "workTree"
  >,
  relative: string
): string | null => {
  if (isPathLocked(policy.lockedPaths ?? [], relative)) {
    return LOCKED_PATH_MESSAGE;
  }

  if (isOutsideFocus(policy.focusPaths ?? [], relative)) {
    return FOCUS_PATH_MESSAGE;
  }

  return bashWriteProblem(policy, relative);
};

const COPY_CODE_TOOL = "mcp__studio__copy_code";
const LIST_BREAKPOINTS_TOOL = "mcp__studio__list_breakpoints";
const SET_BREAKPOINT_STYLE_TOOL = "mcp__studio__set_breakpoint_style";

const DIRECT_EDIT_TOOLS = new Set<string>([
  EDIT_ELEMENT_TOOL,
  SET_PROPS_TOOL,
  REPLACE_STYLE_TOOL,
  INSERT_COMPONENT_TOOL,
  ARRANGE_TOOL,
  CREATE_COMPONENT_TOOL,
  SWAP_INSTANCE_TOOL,
  SET_IMAGE_TOOL,
  SET_BREAKPOINT_STYLE_TOOL,
  ...STUDIO_EDIT_TOOLS_R13,
]);

export const BASH_EDIT_TOOL = "studio:bash-edit";

export const EDIT_TOOL_NAMES: ReadonlySet<string> = new Set<string>([
  "Write",
  "Edit",
  "MultiEdit",
  BASH_EDIT_TOOL,
  ...DIRECT_EDIT_TOOLS,
  ...AGENT_OPS.editIds,
]);

const STUDIO_MCP_TOOLS: readonly string[] = [
  ...LEGACY_AGENT_TOOLS,
  COPY_CODE_TOOL,
  LIST_BREAKPOINTS_TOOL,
  SET_BREAKPOINT_STYLE_TOOL,
  ...AGENT_OPS.toolIds,
];

setToolCatalog({
  blockedTools: new Set<string>([
    CANVAS_PLACE_TOOL,
    ...DIRECT_EDIT_TOOLS,
    ...AGENT_OPS.writeIds,
  ]),
  studioTools: STUDIO_MCP_TOOLS,
});

const DENY_NO_ASK =
  "This integration tool is not on the allowlist, and no approval window is open. Work without it.";

const getIntegrationGate = (
  policy: ToolPolicy,
  toolName: string,
  toolUseId: string,
  input: Parameters<CanUseTool>[1]
): Promise<PermissionResult> | PermissionResult | null => {
  if (toIntegrationAccess(policy, toolName) !== "ask") {
    return null;
  }

  const gate = policy.integrations?.gate ?? null;

  if (gate === null) {
    return { behavior: "deny", message: DENY_NO_ASK };
  }

  return gate(toolName, toolUseId, input);
};

export function createCanUseTool(
  policy: ToolPolicy,
  onDecision?: (toolName: string, result: PermissionResult) => void,
  bashGate?: ToolGate
): CanUseTool {
  return async (toolName, input, options) => {
    const checked = toLockedResult(policy, toolName, input);

    let result =
      checked.behavior === "allow" && toolName === "Bash" && bashGate
        ? await bashGate(options.toolUseID, input)
        : checked;

    if (result.behavior === "allow") {
      result =
        (await getIntegrationGate(
          policy,
          toolName,
          options.toolUseID,
          input
        )) ?? result;
    }

    onDecision?.(toolName, result);

    return result;
  };
}

const NO_CHANGE_TOOLS = new Set([
  ...READ_TOOLS,
  SKILL_TOOL,
  TODO_TOOL,
  TOOL_SEARCH_TOOL,
  STUDIO_HELP_TOOL,
  "mcp__studio__screenshot",
  "mcp__studio__render_check",
  "mcp__studio__design_review",
  DESIGN_SYSTEM_CHECK_TOOL,
  CANVAS_LIST_TOOL,
  CANVAS_PLACE_TOOL,
  CANVAS_POINT_TOOL,
  LIST_LINKS_TOOL,
  ADD_LINK_TOOL,
  KEEP_LINKS_TOOL,
  REMOVE_LINK_TOOL,
  SET_START_FRAME_TOOL,
  UPDATE_LINK_TOOL,
  LIST_FRAME_STATES_TOOL,
  SET_FRAME_STATE_TOOL,
  SET_FRAME_SESSION_TOOL,
  REVIEW_FRAME_TOOL,
  GET_LAYERS_TOOL,
  LIST_ROUTE_LINKS_TOOL,
  ADD_FLOW_TOOL,
  SELECT_MATCHING_TOOL,
  EXPORT_FRAME_TOOL,
  LIST_LOCKS_MCP,
]);

export function canChangePreview(toolName: string): boolean {
  return !NO_CHANGE_TOOLS.has(toolName);
}

export function createPreToolUseGuard(
  policy: ToolPolicy,
  onDecision?: (toolName: string, result: PermissionResult) => void,
  beforeChange?: () => Promise<void>,
  onAllowed?: (
    toolUseId: string,
    toolName: string,
    input: Record<string, unknown>
  ) => void | Promise<void>,
  bashGate?: ToolGate
): HookCallback {
  return async (hookInput) => {
    if (hookInput.hook_event_name !== "PreToolUse") {
      return {};
    }

    const toolInput = hookInput.tool_input;

    const record =
      toolInput && typeof toolInput === "object"
        ? (toolInput as Record<string, unknown>)
        : {};

    const checked = toLockedResult(policy, hookInput.tool_name, record);

    let result =
      checked.behavior === "allow" && hookInput.tool_name === "Bash" && bashGate
        ? await bashGate(hookInput.tool_use_id, record)
        : checked;

    if (result.behavior === "allow") {
      result =
        (await getIntegrationGate(
          policy,
          hookInput.tool_name,
          hookInput.tool_use_id,
          record
        )) ?? result;
    }

    onDecision?.(hookInput.tool_name, result);

    if (result.behavior === "allow") {
      if (beforeChange && canChangePreview(hookInput.tool_name)) {
        await beforeChange();
      }

      await onAllowed?.(hookInput.tool_use_id, hookInput.tool_name, record);

      return {};
    }

    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: result.message,
      },
    };
  };
}

const toLockedProblem = (
  ctx: AgentRunContext,
  relative: string
): string | null => {
  if (isPathLocked(ctx.lockedPaths ?? [], relative)) {
    return LOCKED_PATH_MESSAGE;
  }

  if (isOutsideFocus(ctx.request.focusPaths ?? [], relative)) {
    return FOCUS_PATH_MESSAGE;
  }

  return null;
};

const toWriteProblem = (
  ctx: AgentRunContext,
  relative: string
): string | null => {
  const policy: ToolPolicy = {
    allowBash: false,
    allowInstall: false,
    ...toGateLists(ctx),
    mode: ctx.request.mode,
    workTree: ctx.direction.workTree,
  };

  if (ctx.project.designSystemFor) {
    policy.readOnlyDirs = [SOURCE_DIR];
  }

  const result = toLockedResult(policy, "Write", { file_path: relative });

  if (result.behavior === "deny") {
    return result.message;
  }

  return null;
};

export {
  FOCUS_PATH_MESSAGE,
  LOCKED_PATH_MESSAGE,
  toBashWriteProblem,
  toGateLists,
  toLockedProblem,
  toLockedResult,
  toWriteProblem,
};
