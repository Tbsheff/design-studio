import type { Project, RunMode } from "@design-studio/contracts";

import type { AgentSet } from "./legacy/agent-ops.js";
import { AGENT_OPS } from "./legacy/agent-ops.js";
import { blockedInCritique } from "./permissions.js";

export const HELP_TOOL = "studio_help";

const CORE_TOOLS = [
  "screenshot",
  "render_check",
  "design_review",
  "canvas_list",
  "canvas_place",
  "canvas_point",
  "list_links",
  "edit_links",
  "list_link_interactions",
  "set_link_interaction",
  "get_layers",
  "review_frame",
  "edit_element",
  "set_token",
  "find_styles",
  "replace_style",
  "search_text",
  "update_text",
  "arrange",
  "measure",
  "select_matching",
  "insert_jsx",
  "clear_text",
  "list_icons",
  "insert_icon",
  "list_text_styles",
  "apply_text_style",
  "create_text_style",
  "detach_text_style",
  "list_motion",
  "set_motion",
  "get_spacing",
  "set_spacing",
  "list_breakpoints",
  "set_breakpoint_style",
  "list_state_styles",
  "set_state_style",
  "set_forced_state",
  "get_stacking",
  "set_stacking",
  "copy_code",
  "diff_versions",
  "list_comments",
  "resolve_comment",
  "set_image",
  "search_images",
  "place_image",
  "inspect_accessibility",
  "set_accessibility",
  "import_page",
  "export_frame",
  "draw_vector",
  "boolean_shapes",
  "paint_shape",
  "set_layer_state",
  "list_locked_layers",
  "compare_to_reference",
  "import_figma_frame",
  HELP_TOOL,
];

const TWEAK_TOOLS = ["define_tweaks"];
const DESIGN_SYSTEM_TOOLS = ["design_system_check"];

const KIT_TOOLS = [
  "list_components",
  "component_preview",
  "insert_component",
  "set_props",
  "create_component",
  "create_component_variant",
  "update_component_variant",
  "swap_instance",
];

const LEAN_TOOLS = new Set([
  "screenshot",
  "render_check",
  "edit_element",
  "set_props",
  "measure",
  HELP_TOOL,
]);

const APP_TOOLS = [
  "list_frame_states",
  "set_frame_state",
  "set_frame_session",
  "list_route_links",
  "add_flow",
  "prepare_ship",
  "app_doctor",
  "get_run_context",
];

export type ToolScopeProject = Pick<
  Project,
  "kind" | "app" | "designSystemFor"
>;

function withDerived(names: string[], set: AgentSet): string[] {
  return [...names, ...(AGENT_OPS.bySet.get(set) ?? [])];
}

function scopedTools(project: ToolScopeProject): string[] {
  const app = Boolean(project.app);

  return [
    ...withDerived(CORE_TOOLS, "core"),
    ...(app ? [] : withDerived(TWEAK_TOOLS, "tweak")),
    ...(project.designSystemFor
      ? withDerived(DESIGN_SYSTEM_TOOLS, "design-system")
      : []),
    ...(project.kind === "react" || app ? withDerived(KIT_TOOLS, "kit") : []),
    ...(app ? withDerived(APP_TOOLS, "app") : []),
  ];
}

function isLean(name: string): boolean {
  return LEAN_TOOLS.has(name) || AGENT_OPS.lean.has(name);
}

export function studioToolsFor(
  project: ToolScopeProject,
  mode: RunMode,
  lean = false
): Set<string> {
  const names = scopedTools(project).filter((name) => !lean || isLean(name));

  return new Set(
    mode === "critique"
      ? names.filter((name) => !blockedInCritique(`mcp__studio__${name}`))
      : names
  );
}

export function leanBuiltins(names: string[]): string[] {
  return names.filter(
    (name) => name !== "TodoWrite" && name !== "Bash" && name !== "Skill"
  );
}
