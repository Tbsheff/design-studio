import { z } from 'zod';
import type { DirectEditRequest, DirectEditResult, Direction, Project } from '../../shared/contracts.js';
import type { LayerLocksView } from '../../shared/layer-locks.js';
import { describeLocks, lockDelta, lockOutcome, probeLock } from '../layers/lock-probe.js';
import type { ActivityDraft } from './activity.js';
import { EditError, loadTarget, refuseWhileRunning, studioCall, type EditDeps } from './edit-deps.js';
import { base, defineTool, directionId, ok, pagePath, pageUrl, projectId, selector, sourceElement, versionActivity, type Done } from './edit-kit.js';

export const LAYER_STATE_NOTE =
  'Lock, hide and rename use the same server code as the eye, lock and name in the studio Layers panel. Lock is studio state saved in the Design Studio data folder (not in the project files and not a version): a click on the canvas passes through a locked layer and its children, in the studio and for every MCP client. Hide writes display: none and rename writes data-name in the source, each as one version the user can undo.';

const setSchema = z
  .object({
    projectId,
    directionId,
    path: pagePath,
    selector: selector.describe('Layer id from get_layers or a CSS selector of one element.'),
    locked: z.boolean().optional().describe('true locks the layer, false unlocks it.'),
    hidden: z.boolean().optional().describe('true hides the layer (display: none in the source), false shows it again.'),
    name: z.string().trim().max(80).nullable().optional().describe('New layer name (data-name). null or "" removes the name.'),
  })
  .strict()
  .refine((input) => input.locked !== undefined || input.hidden !== undefined || input.name !== undefined, 'pass locked, hidden or name');

const listSchema = z.object({ projectId, directionId, path: pagePath }).strict();

type Loaded = { project: Project; direction: Direction };

function locksUrl(loaded: Loaded): string {
  return `${base(loaded.project, loaded.direction.id)}/layer-locks`;
}

async function sourceEdit(deps: EditDeps, loaded: Loaded, url: string, input: z.output<typeof setSchema>): Promise<{ lines: string[]; result: DirectEditResult | null }> {
  if (input.hidden === undefined && input.name === undefined) return { lines: [], result: null };
  refuseWhileRunning(deps, loaded.project, loaded.direction);
  const element = await sourceElement(deps, url, input.selector);
  const target = { source: element.source, selector: input.selector, tag: element.tag };
  const requests: DirectEditRequest[] = [];
  if (input.name !== undefined) requests.push({ ...target, name: input.name === null || input.name === '' ? null : input.name });
  if (input.hidden !== undefined) requests.push({ ...target, style: { display: input.hidden ? 'none' : null } });
  const lines: string[] = [];
  let result: DirectEditResult | null = null;
  for (const request of requests) {
    result = await studioCall<DirectEditResult>(deps, 'POST', `${base(loaded.project, loaded.direction.id)}/direct-edit`, request);
    lines.push(request.style ? `${input.hidden ? 'Hid' : 'Showed'} ${element.tag} in ${result.file} (version ${result.version.id}).` : `${request.name ? `Renamed ${element.tag} to "${request.name}"` : `Removed the name of ${element.tag}`} in ${result.file} (version ${result.version.id}).`);
  }
  return { lines, result };
}

function summaryOf(input: z.output<typeof setSchema>): string {
  const parts = [input.name !== undefined ? (input.name ? `Renamed layer to ${input.name}` : 'Removed a layer name') : null, input.hidden !== undefined ? (input.hidden ? 'Hid a layer' : 'Showed a layer') : null, input.locked !== undefined ? (input.locked ? 'Locked a layer' : 'Unlocked a layer') : null];
  return parts.filter(Boolean).join(', ');
}

const setLayerState = defineTool(
  'set_layer_state',
  setSchema,
  { title: 'Lock, hide or rename a layer', description: `Lock or unlock, hide or show, or rename one layer, like the lock, eye and name in the studio Layers panel. ${LAYER_STATE_NOTE}`, idempotent: true },
  async (deps, input): Promise<Done> => {
    const loaded = await loadTarget(deps, input.projectId, input.directionId);
    const url = await pageUrl(deps, loaded.project, loaded.direction, input.path);
    const edited = await sourceEdit(deps, loaded, url, input);
    const lines = [...edited.lines];
    if (input.locked !== undefined) {
      const current = await studioCall<LayerLocksView>(deps, 'GET', locksUrl(loaded));
      const probe = await probeLock(deps.preview, url, input.selector, current.keys);
      if (!probe.found) throw new EditError(`No element matches ${input.selector} on the page.`);
      const view = await studioCall<LayerLocksView>(deps, 'PUT', locksUrl(loaded), lockDelta(probe, input.locked));
      lines.push(lockOutcome(probe, input.locked, view.keys.length));
    }
    const activity: ActivityDraft = edited.result ? versionActivity(loaded.project, loaded.direction, summaryOf(input), edited.result.version) : { projectId: loaded.project.id, directionId: loaded.direction.id, summary: summaryOf(input) };
    return { result: ok(lines.join('\n')), activity };
  },
);

const listLockedLayers = defineTool(
  'list_locked_layers',
  listSchema,
  { title: 'List locked layers', description: `List the locked layers of a direction, with the page of each and whether it is on the page (path) now. ${LAYER_STATE_NOTE}`, readOnly: true, idempotent: true },
  async (deps, input): Promise<Done> => {
    const loaded = await loadTarget(deps, input.projectId, input.directionId);
    const view = await studioCall<LayerLocksView>(deps, 'GET', locksUrl(loaded));
    const probe = view.keys.length > 0 ? await probeLock(deps.preview, await pageUrl(deps, loaded.project, loaded.direction, input.path), null, view.keys).catch(() => null) : null;
    return { result: ok(describeLocks(view.keys, probe?.resolved ?? null, probe?.page ?? null)) };
  },
);

export const LAYER_STATE_TOOLS = [setLayerState, listLockedLayers];
