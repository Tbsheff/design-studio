import { z } from 'zod';
import type { CommitTweaksResult, TweaksState } from '../../shared/tweaks.js';
import { loadTarget, refuseWhileRunning, studioCall } from './edit-deps.js';
import { base, defineTool, directionId, ok, projectId, versionActivity, type ToolSpec } from './edit-kit.js';

const target = z.object({ projectId, directionId }).strict();

const setInput = z
  .object({
    projectId,
    directionId,
    id: z.string().trim().min(1).max(64).describe('Tweak control id from list_tweaks.'),
    value: z.union([z.number(), z.string().max(200), z.boolean()]).describe('New value: a number inside min and max for a range, a CSS color for a color, true or false for a toggle, one option value for a select.'),
  })
  .strict();

const TWEAKS_NOTE = 'Tweaks are the controls (sliders, colors, toggles, selects) that the studio agent made with define_tweaks; the user sees them in the Tweaks panel. Each control sets one CSS variable.';

function controlsView(state: TweaksState) {
  return state.controls.map((control) => ({ ...control, value: state.current[control.id] ?? control.default, ...(state.tokenPaths[control.cssVar] ? { tokenPath: state.tokenPaths[control.cssVar] } : {}) }));
}

const listTweaks = defineTool(
  'list_tweaks',
  target,
  { title: 'List tweaks', description: `List the tweak controls of a direction with their type, CSS variable, limits or options, default and current value. ${TWEAKS_NOTE} An empty list means the agent has not made tweaks for this design. Read only.`, readOnly: true, idempotent: true },
  async (deps, input) => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    const state = await studioCall<TweaksState>(deps, 'GET', `${base(project, direction.id)}/tweaks`);
    return { result: ok({ controls: controlsView(state), problems: state.problems, error: state.error }) };
  },
);

const setTweak = defineTool(
  'set_tweak',
  setInput,
  { title: 'Set tweak', description: `Set one tweak control to a new value with the same code path as the studio Tweaks panel: it rewrites the CSS variable declaration (or the design token behind it) and saves one version the user can undo. ${TWEAKS_NOTE} This is a direct edit; it does not start an AI run. Use list_tweaks first for the ids and valid values.`, idempotent: true },
  async (deps, input) => {
    const { project, direction } = await loadTarget(deps, input.projectId, input.directionId);
    refuseWhileRunning(deps, project, direction);
    const result = await studioCall<CommitTweaksResult>(deps, 'POST', `${base(project, direction.id)}/tweaks/commit`, { values: { [input.id]: input.value } });
    const control = result.state.controls.find((item) => item.id === input.id);
    const value = result.state.current[input.id] ?? input.value;
    const output = ok({ id: input.id, cssVar: control?.cssVar ?? null, value, versionId: result.version.id, title: result.version.title });
    return { result: output, activity: versionActivity(project, direction, `Set tweak ${control?.label ?? input.id} to ${String(value)}`, result.version) };
  },
);

export const TWEAK_TOOLS: ToolSpec[] = [listTweaks, setTweak];
