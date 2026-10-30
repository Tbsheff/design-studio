import type { Project, RunMode } from '../../shared/contracts.js';
import { blockedInCritique } from './permissions.js';

export const HELP_TOOL = 'studio_help';

const CORE_TOOLS = ['screenshot', 'render_check', 'design_review', 'canvas_list', 'canvas_place', 'canvas_point', 'list_links', 'edit_links', 'get_layers', 'review_frame', 'edit_element', 'set_token', 'find_styles', 'replace_style', 'arrange', 'measure', 'select_matching', 'insert_jsx', 'clear_text', 'diff_versions', 'list_comments', 'resolve_comment', 'set_image', 'export_frame', 'draw_vector', 'boolean_shapes', 'paint_shape', 'set_layer_state', 'list_locked_layers', 'compare_to_reference', 'import_figma_frame', HELP_TOOL];
const TWEAK_TOOLS = ['define_tweaks'];
const DESIGN_SYSTEM_TOOLS = ['design_system_check'];
const KIT_TOOLS = ['list_components', 'component_preview', 'insert_component', 'set_props', 'create_component', 'swap_instance'];
const LEAN_TOOLS = new Set(['screenshot', 'render_check', 'edit_element', 'set_props', 'measure', HELP_TOOL]);
const APP_TOOLS = ['list_frame_states', 'set_frame_state', 'set_frame_session', 'list_route_links', 'add_flow', 'prepare_ship', 'app_doctor', 'get_run_context'];

export type ToolScopeProject = Pick<Project, 'kind' | 'app' | 'designSystemFor'>;

function scopedTools(project: ToolScopeProject): string[] {
  const app = Boolean(project.app);
  return [...CORE_TOOLS, ...(app ? [] : TWEAK_TOOLS), ...(project.designSystemFor ? DESIGN_SYSTEM_TOOLS : []), ...(project.kind === 'react' || app ? KIT_TOOLS : []), ...(app ? APP_TOOLS : [])];
}

export function studioToolsFor(project: ToolScopeProject, mode: RunMode, lean = false): Set<string> {
  const names = scopedTools(project).filter((name) => !lean || LEAN_TOOLS.has(name));
  return new Set(mode === 'critique' ? names.filter((name) => !blockedInCritique(`mcp__studio__${name}`)) : names);
}

export function leanBuiltins(names: string[]): string[] {
  return names.filter((name) => name !== 'TodoWrite' && name !== 'Bash' && name !== 'Skill');
}
