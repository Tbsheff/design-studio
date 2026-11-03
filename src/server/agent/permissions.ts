import type {
  CanUseTool,
  HookCallback,
  PermissionResult,
} from "@anthropic-ai/claude-agent-sdk";

import { AGENT_OPS } from "../agent-tools/registry.js";
import {
  READ_TOOLS,
  SKILL_TOOL,
  TODO_TOOL,
  evaluateToolUse,
  setToolCatalog,
} from "../platform/tool-policy/index.js";
import type { ToolPolicy } from "../platform/tool-policy/index.js";
import type { ToolGate } from "./ask-gate.js";
import { LEGACY_AGENT_TOOLS } from "./legacy/all.js";
import {
  ADD_FLOW_TOOL,
  CANVAS_LIST_TOOL,
  CANVAS_PLACE_TOOL,
  CANVAS_POINT_TOOL,
  EDIT_LINKS_TOOL,
  LIST_FRAME_STATES_TOOL,
  LIST_LINKS_TOOL,
  LIST_ROUTE_LINKS_TOOL,
  SET_FRAME_SESSION_TOOL,
  SET_FRAME_STATE_TOOL,
} from "./legacy/canvas.js";
import {
  COMPARE_REFERENCE_TOOL,
  LIST_COMMENTS_TOOL,
  RESOLVE_COMMENT_TOOL,
} from "./legacy/comments.js";
import {
  ARRANGE_TOOL,
  CLEAR_TEXT_TOOL,
  COMPONENT_PREVIEW_TOOL,
  CREATE_COMPONENT_TOOL,
  EDIT_ELEMENT_TOOL,
  GET_LAYERS_TOOL,
  INSERT_COMPONENT_TOOL,
  INSERT_JSX_TOOL,
  LIST_COMPONENTS_TOOL,
  LIST_LOCKS_MCP,
  REPLACE_STYLE_TOOL,
  REVIEW_FRAME_TOOL,
  SELECT_MATCHING_TOOL,
  SET_IMAGE_TOOL,
  SET_PROPS_TOOL,
  SET_TOKEN_TOOL,
  STUDIO_EDIT_TOOLS_R13,
  SWAP_INSTANCE_TOOL,
} from "./legacy/direct-edit.js";
import { EXPORT_FRAME_TOOL } from "./legacy/export.js";
import { APP_DOCTOR_TOOL, GET_RUN_CONTEXT_TOOL } from "./legacy/mcp-read.js";
import { DESIGN_SYSTEM_CHECK_TOOL } from "./legacy/packs.js";
import { STUDIO_HELP_TOOL } from "./legacy/studio.js";
import { DIFF_VERSIONS_TOOL } from "./legacy/versions.js";

export {
  ADD_FLOW_TOOL,
  CANVAS_LIST_TOOL,
  CANVAS_PLACE_TOOL,
  CANVAS_POINT_TOOL,
  EDIT_LINKS_TOOL,
  LIST_FRAME_STATES_TOOL,
  LIST_LINKS_TOOL,
  LIST_ROUTE_LINKS_TOOL,
  SET_FRAME_SESSION_TOOL,
  SET_FRAME_STATE_TOOL,
} from "./legacy/canvas.js";
export { LIST_COMMENTS_TOOL, RESOLVE_COMMENT_TOOL } from "./legacy/comments.js";
export {
  ARRANGE_TOOL,
  CLEAR_TEXT_TOOL,
  COMPONENT_PREVIEW_TOOL,
  CREATE_COMPONENT_TOOL,
  EDIT_ELEMENT_TOOL,
  FIND_STYLES_TOOL,
  GET_LAYERS_TOOL,
  INSERT_COMPONENT_TOOL,
  INSERT_JSX_TOOL,
  LIST_COMPONENTS_TOOL,
  MEASURE_TOOL,
  REPLACE_STYLE_TOOL,
  REVIEW_FRAME_TOOL,
  SELECT_MATCHING_TOOL,
  SET_IMAGE_TOOL,
  SET_PROPS_TOOL,
  SET_TOKEN_TOOL,
  SWAP_INSTANCE_TOOL,
} from "./legacy/direct-edit.js";
export { EXPORT_FRAME_TOOL } from "./legacy/export.js";
export { APP_DOCTOR_TOOL, GET_RUN_CONTEXT_TOOL } from "./legacy/mcp-read.js";
export { DESIGN_SYSTEM_CHECK_TOOL } from "./legacy/packs.js";
export { STUDIO_HELP_TOOL } from "./legacy/studio.js";
export { DIFF_VERSIONS_TOOL } from "./legacy/versions.js";
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

export function holdsUntrustedInput(request: {
  comments?: readonly unknown[];
}): boolean {
  return (request.comments?.length ?? 0) > 0;
}

export function withUntrustedLimits(
  policy: ToolPolicy,
  request: { comments?: readonly unknown[] }
): ToolPolicy {
  return holdsUntrustedInput(request)
    ? { ...policy, allowBash: false, allowInstall: false }
    : policy;
}

const LIST_ICONS_TOOL = "mcp__studio__list_icons";
const INSERT_ICON_TOOL = "mcp__studio__insert_icon";
const LIST_TEXT_STYLES_TOOL = "mcp__studio__list_text_styles";
const APPLY_TEXT_STYLE_TOOL = "mcp__studio__apply_text_style";
const CREATE_TEXT_STYLE_TOOL = "mcp__studio__create_text_style";
const LIST_MOTION_TOOL = "mcp__studio__list_motion";
const SET_MOTION_TOOL = "mcp__studio__set_motion";
const GET_FILL_TOOL = "mcp__studio__get_fill";
const SET_FILL_TOOL = "mcp__studio__set_fill";
const GET_SPACING_TOOL = "mcp__studio__get_spacing";
const SET_SPACING_TOOL = "mcp__studio__set_spacing";
const CREATE_COMPONENT_VARIANT_TOOL = "mcp__studio__create_component_variant";
const UPDATE_COMPONENT_VARIANT_TOOL = "mcp__studio__update_component_variant";
const COPY_CODE_TOOL = "mcp__studio__copy_code";
const LIST_LINK_INTERACTIONS_TOOL = "mcp__studio__list_link_interactions";
const SET_LINK_INTERACTION_TOOL = "mcp__studio__set_link_interaction";
const IMPORT_PAGE_TOOL = "mcp__studio__import_page";
const SEARCH_TEXT_TOOL = "mcp__studio__search_text";
const UPDATE_TEXT_TOOL = "mcp__studio__update_text";
const LIST_BREAKPOINTS_TOOL = "mcp__studio__list_breakpoints";
const SET_BREAKPOINT_STYLE_TOOL = "mcp__studio__set_breakpoint_style";
const LIST_STATE_STYLES_TOOL = "mcp__studio__list_state_styles";
const SET_STATE_STYLE_TOOL = "mcp__studio__set_state_style";
const SET_FORCED_STATE_TOOL = "mcp__studio__set_forced_state";
const GET_STACKING_TOOL = "mcp__studio__get_stacking";
const SET_STACKING_TOOL = "mcp__studio__set_stacking";
const SEARCH_IMAGES_TOOL = "mcp__studio__search_images";
const PLACE_IMAGE_TOOL = "mcp__studio__place_image";
const INSPECT_ACCESSIBILITY_TOOL = "mcp__studio__inspect_accessibility";
const SET_ACCESSIBILITY_TOOL = "mcp__studio__set_accessibility";

const DIRECT_EDIT_TOOLS = new Set<string>([
  INSERT_ICON_TOOL,
  APPLY_TEXT_STYLE_TOOL,
  CREATE_TEXT_STYLE_TOOL,
  SET_MOTION_TOOL,
  SET_FILL_TOOL,
  SET_SPACING_TOOL,
  CREATE_COMPONENT_VARIANT_TOOL,
  UPDATE_COMPONENT_VARIANT_TOOL,
  EDIT_ELEMENT_TOOL,
  SET_TOKEN_TOOL,
  SET_PROPS_TOOL,
  REPLACE_STYLE_TOOL,
  INSERT_COMPONENT_TOOL,
  INSERT_JSX_TOOL,
  CLEAR_TEXT_TOOL,
  ARRANGE_TOOL,
  CREATE_COMPONENT_TOOL,
  SWAP_INSTANCE_TOOL,
  SET_IMAGE_TOOL,
  IMPORT_PAGE_TOOL,
  UPDATE_TEXT_TOOL,
  SET_BREAKPOINT_STYLE_TOOL,
  SET_STATE_STYLE_TOOL,
  SET_STACKING_TOOL,
  PLACE_IMAGE_TOOL,
  SET_ACCESSIBILITY_TOOL,
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
  LIST_ICONS_TOOL,
  INSERT_ICON_TOOL,
  LIST_TEXT_STYLES_TOOL,
  APPLY_TEXT_STYLE_TOOL,
  CREATE_TEXT_STYLE_TOOL,
  LIST_MOTION_TOOL,
  SET_MOTION_TOOL,
  GET_FILL_TOOL,
  SET_FILL_TOOL,
  GET_SPACING_TOOL,
  SET_SPACING_TOOL,
  CREATE_COMPONENT_VARIANT_TOOL,
  UPDATE_COMPONENT_VARIANT_TOOL,
  COPY_CODE_TOOL,
  LIST_LINK_INTERACTIONS_TOOL,
  SET_LINK_INTERACTION_TOOL,
  IMPORT_PAGE_TOOL,
  SEARCH_TEXT_TOOL,
  UPDATE_TEXT_TOOL,
  LIST_BREAKPOINTS_TOOL,
  SET_BREAKPOINT_STYLE_TOOL,
  LIST_STATE_STYLES_TOOL,
  SET_STATE_STYLE_TOOL,
  SET_FORCED_STATE_TOOL,
  GET_STACKING_TOOL,
  SET_STACKING_TOOL,
  SEARCH_IMAGES_TOOL,
  PLACE_IMAGE_TOOL,
  INSPECT_ACCESSIBILITY_TOOL,
  SET_ACCESSIBILITY_TOOL,
  ...AGENT_OPS.toolIds,
];

setToolCatalog({
  blockedTools: new Set<string>([
    CANVAS_PLACE_TOOL,
    EDIT_LINKS_TOOL,
    SET_LINK_INTERACTION_TOOL,
    ADD_FLOW_TOOL,
    ...DIRECT_EDIT_TOOLS,
    ...AGENT_OPS.writeIds,
  ]),
  studioTools: STUDIO_MCP_TOOLS,
});

export function createCanUseTool(
  policy: ToolPolicy,
  onDecision?: (toolName: string, result: PermissionResult) => void,
  bashGate?: ToolGate
): CanUseTool {
  return async (toolName, input, options) => {
    const checked = evaluateToolUse(policy, toolName, input);

    const result =
      checked.behavior === "allow" && toolName === "Bash" && bashGate
        ? await bashGate(options.toolUseID, input)
        : checked;

    onDecision?.(toolName, result);

    return result;
  };
}

const NO_CHANGE_TOOLS = new Set([
  ...READ_TOOLS,
  SKILL_TOOL,
  TODO_TOOL,
  STUDIO_HELP_TOOL,
  "mcp__studio__screenshot",
  "mcp__studio__render_check",
  "mcp__studio__design_review",
  DESIGN_SYSTEM_CHECK_TOOL,
  CANVAS_LIST_TOOL,
  CANVAS_PLACE_TOOL,
  CANVAS_POINT_TOOL,
  LIST_LINKS_TOOL,
  EDIT_LINKS_TOOL,
  LIST_LINK_INTERACTIONS_TOOL,
  SET_LINK_INTERACTION_TOOL,
  LIST_FRAME_STATES_TOOL,
  SET_FRAME_STATE_TOOL,
  SET_FRAME_SESSION_TOOL,
  REVIEW_FRAME_TOOL,
  LIST_COMPONENTS_TOOL,
  GET_LAYERS_TOOL,
  LIST_COMMENTS_TOOL,
  RESOLVE_COMMENT_TOOL,
  LIST_ROUTE_LINKS_TOOL,
  ADD_FLOW_TOOL,
  GET_RUN_CONTEXT_TOOL,
  APP_DOCTOR_TOOL,
  COMPONENT_PREVIEW_TOOL,
  SELECT_MATCHING_TOOL,
  DIFF_VERSIONS_TOOL,
  EXPORT_FRAME_TOOL,
  LIST_LOCKS_MCP,
  COMPARE_REFERENCE_TOOL,
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

    const checked = evaluateToolUse(policy, hookInput.tool_name, record);

    const result =
      checked.behavior === "allow" && hookInput.tool_name === "Bash" && bashGate
        ? await bashGate(hookInput.tool_use_id, record)
        : checked;

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
