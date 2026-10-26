import {
  CANVAS_GAP,
  CANVAS_MAX_COORD,
  CANVAS_MAX_FRAMES,
  CANVAS_MAX_SIDE,
  CANVAS_MIN_SIDE,
  cleanFrameLabel,
  cleanFramePath,
  nextFrameId,
  type CanvasFile,
  type CanvasFileFrame,
} from '../../shared/canvas-file.js';
import type { Direction, Project, RunMode } from '../../shared/contracts.js';
import type { CanvasService } from './service.js';

export const CANVAS_VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

export type CanvasViewport = keyof typeof CANVAS_VIEWPORTS;

export interface PlaceSpec {
  frame?: string;
  label?: string;
  path?: string;
  viewport?: CanvasViewport;
  width?: number;
  height?: number;
  below?: string;
  rightOf?: string;
  leftOf?: string;
  above?: string;
  gap?: number;
  x?: number;
  y?: number;
  hidden?: boolean;
}

export interface CanvasToolContext {
  canvas: CanvasService;
  project: Project;
  direction: Direction;
  mode: RunMode;
  plan: boolean;
}

export interface ToolText {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const RELATIONS = ['below', 'rightOf', 'leftOf', 'above'] as const;
type Relation = (typeof RELATIONS)[number];

class PlaceError extends Error {}

function text(value: unknown): ToolText {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] };
}

function failure(message: string): ToolText {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function describeFrame(frame: CanvasFileFrame, ownerId: string) {
  return {
    id: frame.id,
    label: frame.label ?? null,
    page: frame.path ?? '(entry page)',
    direction: frame.directionId ?? `${ownerId} (follows the current direction)`,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    ...(frame.hidden ? { hidden: true } : {}),
  };
}

export function findFrame(frames: readonly CanvasFileFrame[], ref: string): CanvasFileFrame | null {
  const key = ref.trim();
  if (key.startsWith('@')) {
    const label = key.slice(1).trim().toLowerCase();
    return frames.find((frame) => frame.label?.toLowerCase() === label) ?? null;
  }
  return frames.find((frame) => frame.id === key) ?? frames.find((frame) => frame.label?.toLowerCase() === key.toLowerCase()) ?? null;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function overlapWarnings(frames: readonly CanvasFileFrame[], ids: readonly string[]): string[] {
  const shown = frames.filter((frame) => !frame.hidden);
  const warnings: string[] = [];
  for (const id of ids) {
    const frame = shown.find((item) => item.id === id);
    if (!frame) continue;
    for (const other of shown) {
      if (other.id === frame.id || !overlaps(frame, other)) continue;
      const pair = [frame.id, other.id].sort().join(' and ');
      const line = `${pair} overlap. Move one with canvas_place (for example rightOf or below the other).`;
      if (!warnings.includes(line)) warnings.push(line);
    }
  }
  return warnings;
}

function sizeOf(spec: PlaceSpec, existing: CanvasFileFrame | null, ref: CanvasFileFrame | null): { width: number; height: number } {
  const preset = spec.viewport ? CANVAS_VIEWPORTS[spec.viewport] : null;
  const base = existing ?? ref ?? null;
  const width = spec.width ?? preset?.width ?? base?.width ?? CANVAS_VIEWPORTS.desktop.width;
  const height = spec.height ?? preset?.height ?? base?.height ?? CANVAS_VIEWPORTS.desktop.height;
  const clamp = (n: number) => Math.round(Math.min(CANVAS_MAX_SIDE, Math.max(CANVAS_MIN_SIDE, n)));
  return { width: clamp(width), height: clamp(height) };
}

function relationOf(spec: PlaceSpec): { relation: Relation; ref: string } | null {
  const found = RELATIONS.filter((relation) => typeof spec[relation] === 'string' && (spec[relation] as string).trim() !== '');
  if (found.length > 1) throw new PlaceError(`Use one of below, rightOf, leftOf or above, not ${found.join(' and ')}.`);
  const relation = found[0];
  return relation ? { relation, ref: spec[relation] as string } : null;
}

function relativeSpot(relation: Relation, ref: Rect, size: { width: number; height: number }, gap: number): { x: number; y: number } {
  if (relation === 'below') return { x: ref.x, y: ref.y + ref.height + gap };
  if (relation === 'above') return { x: ref.x, y: ref.y - gap - size.height };
  if (relation === 'rightOf') return { x: ref.x + ref.width + gap, y: ref.y };
  return { x: ref.x - gap - size.width, y: ref.y };
}

function besideAll(frames: readonly CanvasFileFrame[], gap: number): { x: number; y: number } {
  const shown = frames.filter((frame) => !frame.hidden);
  if (shown.length === 0) return { x: 0, y: 0 };
  const right = Math.max(...shown.map((frame) => frame.x + frame.width));
  const top = Math.min(...shown.map((frame) => frame.y));
  return { x: right + gap, y: top };
}

function clampCoord(n: number): number {
  return Math.round(Math.min(CANVAS_MAX_COORD, Math.max(-CANVAS_MAX_COORD, n)));
}

function resolveRef(frames: readonly CanvasFileFrame[], ref: string): CanvasFileFrame {
  const found = findFrame(frames, ref);
  if (!found) throw new PlaceError(`No frame ${ref}. Call canvas_list for the ids and labels.`);
  return found;
}

function spotOf(frames: CanvasFileFrame[], spec: PlaceSpec, existing: CanvasFileFrame | null): { x: number; y: number; width: number; height: number } {
  const relative = relationOf(spec);
  const ref = relative ? resolveRef(frames, relative.ref) : null;
  if (ref && existing && ref.id === existing.id) throw new PlaceError(`A frame cannot be placed relative to itself (${ref.id}).`);
  const size = sizeOf(spec, existing, ref);
  const gap = Math.round(Math.min(2000, Math.max(0, spec.gap ?? CANVAS_GAP)));
  const others = frames.filter((frame) => frame.id !== existing?.id);
  const fallback = existing ? { x: existing.x, y: existing.y } : besideAll(others, gap);
  const spot = ref && relative ? relativeSpot(relative.relation, ref, size, gap) : fallback;
  return { ...size, x: clampCoord(spec.x ?? spot.x), y: clampCoord(spec.y ?? spot.y) };
}

function pathOf(spec: PlaceSpec, existing: CanvasFileFrame | null): string | undefined {
  const raw = spec.path === undefined ? existing?.path : spec.path;
  if (raw === undefined) return undefined;
  const path = cleanFramePath(raw);
  if (path === null) throw new PlaceError(`Path ${raw} is not a page inside the project. Use a relative path like states/empty.html, with no "..", "?" or "#".`);
  return path || undefined;
}

function labelOf(spec: PlaceSpec, existing: CanvasFileFrame | null): string | undefined {
  if (spec.label === undefined) return existing?.label;
  return cleanFrameLabel(spec.label) ?? undefined;
}

function withOptional(frame: CanvasFileFrame, extra: { directionId?: string; path?: string; label?: string; hidden?: boolean }): CanvasFileFrame {
  const out = { ...frame };
  if (extra.directionId) out.directionId = extra.directionId;
  if (extra.path) out.path = extra.path;
  if (extra.label) out.label = extra.label;
  if (extra.hidden) out.hidden = true;
  return out;
}

function placeOne(frames: CanvasFileFrame[], spec: PlaceSpec, directionId: string): CanvasFileFrame {
  const existing = spec.frame ? resolveRef(frames, spec.frame) : null;
  if (!existing && frames.length >= CANVAS_MAX_FRAMES) throw new PlaceError(`The canvas has the most frames it can hold (${CANVAS_MAX_FRAMES}). Move or reuse a frame instead.`);
  const spot = spotOf(frames, spec, existing);
  const base: CanvasFileFrame = { id: existing?.id ?? nextFrameId(frames), ...spot, order: existing?.order ?? frames.length };
  return withOptional(base, {
    directionId: existing ? existing.directionId : directionId,
    path: pathOf(spec, existing),
    label: labelOf(spec, existing),
    hidden: spec.hidden ?? existing?.hidden,
  });
}

export function applyPlacement(file: CanvasFile, specs: readonly PlaceSpec[], directionId: string): { file: CanvasFile; placed: CanvasFileFrame[] } {
  let frames = [...file.frames];
  const placed: CanvasFileFrame[] = [];
  for (const spec of specs) {
    const frame = placeOne(frames, spec, directionId);
    const at = frames.findIndex((item) => item.id === frame.id);
    frames = at === -1 ? [...frames, frame] : frames.map((item) => (item.id === frame.id ? frame : item));
    const done = placed.findIndex((item) => item.id === frame.id);
    if (done === -1) placed.push(frame);
    else placed[done] = frame;
  }
  return { file: { ...file, frames }, placed };
}

export async function canvasList(ctx: CanvasToolContext): Promise<ToolText> {
  const owner = ctx.canvas.ownerOf(ctx.project);
  const { canvas } = await ctx.canvas.read(ctx.project);
  const presence = ctx.canvas.presence(ctx.project.id);
  const frames = canvas?.frames ?? [];
  return text({
    frames: frames.map((frame) => describeFrame(frame, owner.id)),
    lofi: canvas?.lofi ?? [],
    user: presence
      ? { currentDirection: presence.directionId, liveFrame: presence.activeFrameId, inView: presence.inView, selection: presence.selection }
      : { note: 'The studio window is not open, so the selection and the frame in view are not known.' },
    thisRun: { direction: ctx.direction.id },
    note: frames.length === 0 ? 'No saved layout yet. The canvas shows one frame (f1) with the entry page at the size the user picked. canvas_place with frame "f1" or a new frame saves the layout.' : undefined,
  });
}

export async function canvasPlace(ctx: CanvasToolContext, specs: readonly PlaceSpec[]): Promise<ToolText> {
  if (ctx.plan) return failure('Plan mode is on, so the canvas stays as it is. Describe the frames in the plan.');
  if (ctx.mode === 'critique') return failure('canvas_place is not available in critique runs. Use canvas_point to show a frame.');
  if (specs.length === 0) return failure('Pass at least one frame to place.');
  let placed: CanvasFileFrame[] = [];
  let warnings: string[] = [];
  try {
    const result = await ctx.canvas.update(
      ctx.project,
      (file) => {
        const next = applyPlacement(seedDefault(file, ctx), specs, ctx.direction.id);
        placed = next.placed;
        warnings = overlapWarnings(next.file.frames, placed.map((frame) => frame.id));
        return next.file;
      },
      { source: 'agent' },
    );
    return text({ placed: placed.map((frame) => describeFrame(frame, ctx.canvas.ownerOf(ctx.project).id)), frames: result.canvas?.frames.length ?? 0, warnings });
  } catch (error) {
    if (error instanceof PlaceError) return failure(error.message);
    throw error;
  }
}

function seedDefault(file: CanvasFile, ctx: CanvasToolContext): CanvasFile {
  if (file.frames.length > 0) return file;
  const presence = ctx.canvas.presence(ctx.project.id);
  const size = presence?.liveSize ?? CANVAS_VIEWPORTS.desktop;
  return { ...file, frames: [{ id: 'f1', width: size.width, height: size.height, x: 0, y: 0, order: 0 }] };
}

export async function canvasPoint(ctx: CanvasToolContext, args: { frame: string; selector?: string }): Promise<ToolText> {
  const { canvas } = await ctx.canvas.read(ctx.project);
  const frames = canvas?.frames ?? [];
  const frame = frames.length === 0 && (args.frame === 'f1' || args.frame === '') ? null : findFrame(frames, args.frame);
  if (frames.length > 0 && !frame) return failure(`No frame ${args.frame}. Call canvas_list for the ids and labels.`);
  const id = frame?.id ?? 'f1';
  const selector = args.selector?.trim() || undefined;
  ctx.canvas.point(ctx.project, id, selector);
  const where = frame?.label ? `${id} (${frame.label})` : id;
  const open = ctx.canvas.presence(ctx.project.id) ? '' : ' The studio window is not open now, so the user sees it the next time they look.';
  return text(`Showing ${where}${selector ? `, element ${selector}` : ''} on the user's canvas.${open}`);
}
