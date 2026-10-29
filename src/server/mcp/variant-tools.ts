import { z } from 'zod';
import type { Direction, Project, Version } from '../../shared/contracts.js';
import type { CanvasFile } from '../../shared/canvas-file.js';
import { EditError, studioCall, type EditDeps } from './edit-deps.js';
import { defineTool, id, ok, projectId, versionActivity, type ToolSpec } from './edit-kit.js';

const keepInput = z
  .object({
    projectId,
    groupId: z.string().min(1).max(64).describe('Variant group id from list_variants.'),
    directionId: z.string().min(1).max(64).describe('Direction id of the variant to keep, from list_variants.'),
  })
  .strict();

const keepVariant = defineTool(
  'keep_variant',
  keepInput,
  {
    title: 'Keep element variant',
    description:
      'Apply one element variant to the design it came from, as one new version, and discard the other variants of its group. Use list_variants first: only a variant in state "ready" can be kept. This tool cannot start variant runs; the user starts them in the studio.',
  },
  async (deps, input) => {
    const project = await deps.projects.get(input.projectId);
    const variant = project.directions.find((d) => d.id === input.directionId);
    if (!variant?.variation?.scope || variant.variation.groupId !== input.groupId) throw new EditError('No element variant with that groupId and directionId. Call list_variants.');
    const kept = await studioCall<{ versionId: string; directionId: string; label: string }>(deps, 'POST', `/api/projects/${encodeURIComponent(project.id)}/variations/${encodeURIComponent(input.groupId)}/keep`, { directionId: input.directionId });
    const latest = await deps.projects.get(project.id);
    const target = latest.directions.find((d) => d.id === kept.directionId);
    const version: Version | null = target ? await deps.versions.get(latest, kept.versionId).catch(() => null) : null;
    return {
      result: ok({ kept: kept.label, versionId: kept.versionId, directionId: kept.directionId }),
      ...(target ? { activity: versionActivity(latest, target, `Kept element variant ${kept.label}`, version) } : {}),
    };
  },
);

const PAGE_NOTE = 'A page variation is a whole-page direction (1a, 1b, 1c) that the studio made from one prompt and shows side by side on the canvas. These tools change only the canvas and the variation state, like Keep on a variation frame in the studio: they never start, steer or stop a run, and they delete no direction or version (the Versions panel still has them).';

function pageGroups(project: Project): Map<string, Direction[]> {
  const groups = new Map<string, Direction[]>();
  for (const direction of project.directions) {
    const variation = direction.variation;
    if (!variation || variation.scope) continue;
    groups.set(variation.groupId, [...(groups.get(variation.groupId) ?? []), direction]);
  }
  for (const list of groups.values()) list.sort((a, b) => (a.variation?.index ?? 0) - (b.variation?.index ?? 0));
  return groups;
}

function pageVariation(project: Project, directionId: string): { direction: Direction; group: Direction[] } {
  const direction = project.directions.find((item) => item.id === directionId);
  if (!direction?.variation || direction.variation.scope) throw new EditError(`No page variation with directionId ${directionId}. Call list_page_variations.`);
  return { direction, group: pageGroups(project).get(direction.variation.groupId) ?? [direction] };
}

function refuseRunning(deps: EditDeps, project: Project, directions: Direction[]): void {
  const running = directions.filter((item) => deps.runner.isRunning(project.id, item.id));
  if (running.length > 0) throw new EditError(`${running.map((item) => item.variation?.label ?? item.name).join(', ')} still ${running.length === 1 ? 'runs' : 'run'}. Wait for the run to finish, or stop it in the studio, then try again.`);
}

async function settle(deps: EditDeps, project: Project, directions: Direction[], keptId: string | null): Promise<void> {
  for (const direction of directions) {
    if (!direction.variation) continue;
    const settled = direction.id === keptId ? 'kept' : 'discarded';
    if (direction.variation.settled === settled) continue;
    const updated = await deps.projects.updateDirection(project.id, direction.id, { variation: { ...direction.variation, settled } });
    deps.bus.emit({ type: 'direction.updated', projectId: project.id, directionId: direction.id, direction: updated });
  }
}

async function dropFrames(deps: EditDeps, project: Project, drop: Set<string>): Promise<number> {
  let removed = 0;
  await deps.canvas.update(
    project,
    (file: CanvasFile) => {
      const frames = file.frames.filter((frame) => !frame.directionId || !drop.has(frame.directionId));
      removed = file.frames.length - frames.length;
      if (removed === 0) return null;
      if (frames.length === 0) throw new EditError('The canvas needs at least one frame, so this variation frame stays.');
      return { ...file, frames };
    },
    { source: 'agent' },
  );
  return removed;
}

function labelOf(direction: Direction): string {
  return `${direction.variation?.label ?? ''} (${direction.variation?.title ?? direction.name})`;
}

const variationId = id('Direction id of the page variation, from list_page_variations.');

const listPageVariations = defineTool(
  'list_page_variations',
  z.object({ projectId }).strict(),
  { title: 'List page variations', description: `List the page variation groups of a project with the directionId, label, title, run state, kept or discarded state and canvas frames of each variation. ${PAGE_NOTE}`, readOnly: true, idempotent: true },
  async (deps, input) => {
    const project = await deps.projects.get(input.projectId);
    const frames = (await deps.canvas.read(project)).canvas?.frames ?? [];
    const groups = [...pageGroups(project)].map(([groupId, list]) => ({
      groupId,
      prompt: list[0]?.variation?.prompt ?? '',
      variations: list.map((direction) => ({
        directionId: direction.id,
        label: direction.variation?.label ?? '',
        title: direction.variation?.title ?? direction.name,
        running: deps.runner.isRunning(project.id, direction.id),
        state: direction.variation?.settled ?? 'open',
        headVersionId: direction.headVersionId,
        frames: frames.filter((frame) => frame.directionId === direction.id).map((frame) => frame.id),
      })),
    }));
    return { result: ok(groups.length > 0 ? { groups } : 'This project has no page variations. The user starts them in the studio.') };
  },
);

const keepPageVariation = defineTool(
  'keep_page_variation',
  z.object({ projectId, directionId: variationId }).strict(),
  { title: 'Keep page variation', description: `Keep one page variation, like Keep on its frame in the studio: the other variations of its group leave the canvas and are marked discarded, and the kept one stays as its own direction. Refused while a variation of the group still runs. ${PAGE_NOTE}`, idempotent: true },
  async (deps, input) => {
    const project = await deps.projects.get(input.projectId);
    const { direction, group } = pageVariation(project, input.directionId);
    refuseRunning(deps, project, group);
    const others = group.filter((item) => item.id !== direction.id);
    const removed = await dropFrames(deps, project, new Set(others.map((item) => item.id)));
    await settle(deps, project, group, direction.id);
    return {
      result: ok({ kept: labelOf(direction), directionId: direction.id, discarded: others.map((item) => item.id), framesRemoved: removed, note: 'Pass this directionId to the edit tools to keep working on the kept design.' }),
      activity: { projectId: project.id, directionId: direction.id, summary: `Kept page variation ${labelOf(direction)}` },
    };
  },
);

const discardPageVariation = defineTool(
  'discard_page_variation',
  z.object({ projectId, directionId: variationId }).strict(),
  { title: 'Discard page variation', description: `Discard one page variation: its frames leave the canvas and it is marked discarded. The other variations stay. Refused while it runs. ${PAGE_NOTE}`, destructive: true, idempotent: true },
  async (deps, input) => {
    const project = await deps.projects.get(input.projectId);
    const { direction, group } = pageVariation(project, input.directionId);
    refuseRunning(deps, project, [direction]);
    const open = group.filter((item) => item.id !== direction.id && item.variation?.settled !== 'discarded');
    if (open.length === 0) throw new EditError('This is the last open variation of its group. Use keep_page_variation to keep it.');
    const removed = await dropFrames(deps, project, new Set([direction.id]));
    await settle(deps, project, [direction], null);
    return {
      result: ok({ discarded: labelOf(direction), directionId: direction.id, framesRemoved: removed, open: open.map((item) => item.id) }),
      activity: { projectId: project.id, directionId: direction.id, summary: `Discarded page variation ${labelOf(direction)}` },
    };
  },
);

export const VARIANT_TOOLS: ToolSpec[] = [keepVariant, listPageVariations, keepPageVariation, discardPageVariation];
