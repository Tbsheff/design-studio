import type { AppRoute, Direction, Project, RunCanvasRef } from '../../shared/contracts.js';
import { cleanFramePath } from '../../shared/canvas-file.js';
import { DEFAULT_FRAME_STATE, stateLabel, withFrameStateHost, type FrameStatesView } from '../../shared/frame-state.js';
import { listAppRoutes } from '../app/routes.js';
import { frameStatesView, stateOfFrame } from '../app/frame-state.js';
import type { CanvasService } from '../canvas/service.js';
import { findFrame } from '../canvas/tools.js';
import { withPagePath } from '../export/source.js';
import type { AgentRunContext } from '../types.js';

export interface TargetFrame {
  id: string;
  label: string | null;
  path: string;
  width: number;
  height: number;
}

export interface RunTarget extends TargetFrame {
  state: string;
  stateName: string | null;
  routeFile: string | null;
  inView: TargetFrame[];
}

export interface ShotArgs {
  frame?: string;
  path?: string;
  state?: string;
}

export interface ShotTarget {
  url: string;
  path: string;
  state: string;
  frameId: string | null;
  size: { width: number; height: number } | null;
  label: string;
}

export interface TargetDeps {
  canvas: CanvasService;
  projectDir: (projectId: string) => string;
}

type SavedFrame = NonNullable<ReturnType<typeof findFrame>>;

const MAX_IN_VIEW = 8;

function segmentsOf(value: string): string[] {
  return value.split('/').filter(Boolean);
}

function segmentMatches(pattern: string[], actual: string[]): boolean {
  for (const [index, part] of pattern.entries()) {
    if (/^\[\[?\.\.\./.test(part)) return part.startsWith('[[') || actual.length > index;
    const value = actual[index];
    if (value === undefined) return false;
    if (!part.startsWith('[') && part !== value) return false;
  }
  return pattern.length === actual.length;
}

export function matchRouteFile(routes: readonly AppRoute[], framePath: string): string | null {
  const actual = segmentsOf(framePath.split('?')[0] ?? '');
  const exact = routes.find((route) => segmentsOf(route.route).join('/') === actual.join('/'));
  if (exact) return exact.file;
  return routes.find((route) => route.dynamic && segmentMatches(segmentsOf(route.route), actual))?.file ?? null;
}

async function routeFileOf(project: Project, direction: Direction, framePath: string): Promise<string | null> {
  if (project.app) return matchRouteFile(await listAppRoutes(direction.workTree, project.app.appDir).catch(() => []), framePath);
  if (project.kind === 'html') return framePath || project.entry || 'index.html';
  return null;
}

function frameOf(saved: SavedFrame | null, ref: Pick<RunCanvasRef, 'frameId' | 'label' | 'path' | 'width' | 'height'>): TargetFrame {
  return {
    id: saved?.id ?? ref.frameId,
    label: saved?.label ?? ref.label ?? null,
    path: saved ? (saved.path ?? '') : ref.path,
    width: saved?.width ?? ref.width,
    height: saved?.height ?? ref.height,
  };
}

function inViewOf(frames: readonly SavedFrame[], ref: RunCanvasRef): TargetFrame[] {
  const ids = (ref.inView ?? []).filter((id) => id !== ref.frameId).slice(0, MAX_IN_VIEW);
  return ids.flatMap((id) => {
    const saved = frames.find((frame) => frame.id === id);
    return saved ? [frameOf(saved, { frameId: id, path: '', width: saved.width, height: saved.height })] : [];
  });
}

async function statesOf(deps: TargetDeps, project: Project): Promise<FrameStatesView | null> {
  return project.app ? frameStatesView(deps.projectDir(project.id)).catch(() => null) : null;
}

export async function resolveRunTarget(deps: TargetDeps, project: Project, direction: Direction, ref: RunCanvasRef | undefined): Promise<RunTarget | null> {
  if (!ref) return null;
  const frames = ((await deps.canvas.read(project).catch(() => null))?.canvas?.frames ?? []) as SavedFrame[];
  const saved = frames.find((frame) => frame.id === ref.frameId) ?? null;
  const frame = frameOf(saved, ref);
  const view = await statesOf(deps, project);
  const state = view ? stateOfFrame(view, frame.id) : DEFAULT_FRAME_STATE;
  return { ...frame, state, stateName: stateLabel(view, state), routeFile: await routeFileOf(project, direction, frame.path).catch(() => null), inView: inViewOf(frames, ref) };
}

export function pageUrl(base: string, framePath: string, state: string): string {
  return withPagePath(withFrameStateHost(base, state), framePath || undefined);
}

export function targetLabel(target: Pick<ShotTarget, 'path' | 'state' | 'frameId'>): string {
  const page = target.path ? `/${target.path}` : 'the entry page';
  const frame = target.frameId ? ` (frame ${target.frameId})` : '';
  const state = target.state !== DEFAULT_FRAME_STATE ? `, state ${target.state}` : '';
  return `${page}${frame}${state}`;
}

function shotOf(base: string, picked: { path: string; state: string; frameId: string | null; size: ShotTarget['size'] }): ShotTarget {
  return { ...picked, url: pageUrl(base, picked.path, picked.state), label: targetLabel(picked) };
}

export function defaultShotTarget(ctx: Pick<AgentRunContext, 'previewUrl' | 'target'>, state?: string): ShotTarget | null {
  if (!ctx.previewUrl) return null;
  const target = ctx.target;
  if (!target) return shotOf(ctx.previewUrl, { path: '', state: state ?? DEFAULT_FRAME_STATE, frameId: null, size: null });
  return shotOf(ctx.previewUrl, { path: target.path, state: state ?? target.state, frameId: target.id, size: { width: target.width, height: target.height } });
}

async function namedFrame(deps: TargetDeps | null, ctx: Pick<AgentRunContext, 'project' | 'target'>, ref: string): Promise<{ frame: TargetFrame; state: string }> {
  const frames = deps ? (((await deps.canvas.read(ctx.project)).canvas?.frames ?? []) as SavedFrame[]) : [];
  const saved = findFrame(frames, ref);
  if (saved) {
    const view = deps ? await statesOf(deps, ctx.project) : null;
    return { frame: frameOf(saved, { frameId: saved.id, path: '', width: saved.width, height: saved.height }), state: view ? stateOfFrame(view, saved.id) : DEFAULT_FRAME_STATE };
  }
  const target = ctx.target;
  if (target && (ref === target.id || ref.replace(/^@/, '').toLowerCase() === target.label?.toLowerCase())) return { frame: target, state: target.state };
  throw new Error(`No frame ${ref} on the canvas. Use canvas_list for the frame ids.`);
}

export async function resolveShotTarget(deps: TargetDeps | null, ctx: Pick<AgentRunContext, 'project' | 'previewUrl' | 'target'>, args: ShotArgs): Promise<ShotTarget | null> {
  if (!ctx.previewUrl) return null;
  if (args.frame) {
    const { frame, state } = await namedFrame(deps, ctx, args.frame);
    return shotOf(ctx.previewUrl, { path: args.path === undefined ? frame.path : pathArg(args.path), state: args.state ?? state, frameId: frame.id, size: { width: frame.width, height: frame.height } });
  }
  if (args.path !== undefined) return shotOf(ctx.previewUrl, { path: pathArg(args.path), state: args.state ?? ctx.target?.state ?? DEFAULT_FRAME_STATE, frameId: null, size: null });
  return defaultShotTarget(ctx, args.state);
}

function pathArg(raw: string): string {
  const clean = cleanFramePath(raw);
  if (clean === null) throw new Error(`path ${raw} is not a page path. Pass a path such as /settings or about.html.`);
  return clean;
}
