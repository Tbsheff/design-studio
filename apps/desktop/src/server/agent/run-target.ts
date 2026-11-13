import type {
  Direction,
  Project,
  RunCanvasRef,
} from "@design-studio/contracts";
import { cleanFramePath } from "@design-studio/contracts/canvas-file";
import {
  DEFAULT_FRAME_STATE,
  stateLabel,
  withFrameStateHost,
} from "@design-studio/contracts/frame-state";
import type { FrameStatesView } from "@design-studio/contracts/frame-state";

import type { RunTarget, TargetFrame } from "../../shared/run-target.js";
import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import { frameStatesView, stateOfFrame } from "../app/frame-state.js";
import { listAppRoutes, matchRouteFile } from "../app/routes.js";
import type { CanvasService } from "../canvas/index.js";
import { findFrame } from "../canvas/index.js";
import { withPagePath } from "../export/source.js";
import { pageOwner, probeLayout } from "./layout-region.js";

export type { RunTarget, TargetFrame } from "../../shared/run-target.js";

export { matchRouteFile } from "../app/routes.js";

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

async function routeFileOf(
  project: Project,
  direction: Direction,
  framePath: string
): Promise<string | null> {
  if (project.app) {
    return matchRouteFile(
      await listAppRoutes(direction.workTree, project.app.appDir).catch(
        () => []
      ),
      framePath
    );
  }

  if (project.kind === "html") {
    return framePath || project.entry || "index.html";
  }

  return null;
}

function frameOf(
  saved: SavedFrame | null,
  ref: Pick<RunCanvasRef, "frameId" | "label" | "path" | "width" | "height">
): TargetFrame {
  return {
    height: saved?.height ?? ref.height,
    id: saved?.id ?? ref.frameId,
    label: saved?.label ?? ref.label ?? null,
    layoutGrid: saved?.layoutGrid ?? null,
    path: saved ? (saved.path ?? "") : ref.path,
    width: saved?.width ?? ref.width,
  };
}

function inViewOf(
  frames: readonly SavedFrame[],
  ref: RunCanvasRef
): TargetFrame[] {
  const ids = (ref.inView ?? [])
    .filter((id) => id !== ref.frameId)
    .slice(0, MAX_IN_VIEW);

  return ids.flatMap((id) => {
    const saved = frames.find((frame) => frame.id === id);

    return saved
      ? [
          frameOf(saved, {
            frameId: id,
            height: saved.height,
            path: "",
            width: saved.width,
          }),
        ]
      : [];
  });
}

async function statesOf(
  deps: TargetDeps,
  project: Project
): Promise<FrameStatesView | null> {
  return project.app
    ? frameStatesView(deps.projectDir(project.id)).catch(() => null)
    : null;
}

export async function resolveRunTarget(
  deps: TargetDeps,
  project: Project,
  direction: Direction,
  ref: RunCanvasRef | undefined
): Promise<RunTarget | null> {
  if (!ref) {
    return null;
  }

  const frames = ((await deps.canvas.read(project).catch(() => null))?.canvas
    ?.frames ?? []) as SavedFrame[];

  const saved = frames.find((frame) => frame.id === ref.frameId) ?? null;
  const frame = frameOf(saved, ref);
  const view = await statesOf(deps, project);
  const state = view ? stateOfFrame(view, frame.id) : DEFAULT_FRAME_STATE;

  return {
    ...frame,
    inView: inViewOf(frames, ref),
    routeFile: await routeFileOf(project, direction, frame.path).catch(
      () => null
    ),
    state,
    stateName: stateLabel(view, state),
  };
}

export function pageUrl(
  base: string,
  framePath: string,
  state: string
): string {
  return withPagePath(withFrameStateHost(base, state), framePath || undefined);
}

export function targetLabel(
  target: Pick<ShotTarget, "path" | "state" | "frameId">
): string {
  const page = target.path ? `/${target.path}` : "the entry page";
  const frame = target.frameId ? ` (frame ${target.frameId})` : "";

  const state =
    target.state === DEFAULT_FRAME_STATE ? "" : `, state ${target.state}`;

  return `${page}${frame}${state}`;
}

function shotOf(
  base: string,
  picked: {
    path: string;
    state: string;
    frameId: string | null;
    size: ShotTarget["size"];
  }
): ShotTarget {
  return {
    ...picked,
    label: targetLabel(picked),
    url: pageUrl(base, picked.path, picked.state),
  };
}

export function defaultShotTarget(
  ctx: Pick<AgentRunContext, "previewUrl" | "target">,
  state?: string
): ShotTarget | null {
  if (!ctx.previewUrl) {
    return null;
  }

  const { target } = ctx;

  if (!target) {
    return shotOf(ctx.previewUrl, {
      frameId: null,
      path: "",
      size: null,
      state: state ?? DEFAULT_FRAME_STATE,
    });
  }

  return shotOf(ctx.previewUrl, {
    frameId: target.id,
    path: target.path,
    size: { height: target.height, width: target.width },
    state: state ?? target.state,
  });
}

async function namedFrame(
  deps: TargetDeps | null,
  ctx: Pick<AgentRunContext, "project" | "target">,
  ref: string
): Promise<{ frame: TargetFrame; state: string }> {
  const frames = deps
    ? (((await deps.canvas.read(ctx.project)).canvas?.frames ??
        []) as SavedFrame[])
    : [];

  const saved = findFrame(frames, ref);

  if (saved) {
    const view = deps ? await statesOf(deps, ctx.project) : null;

    return {
      frame: frameOf(saved, {
        frameId: saved.id,
        height: saved.height,
        path: "",
        width: saved.width,
      }),
      state: view ? stateOfFrame(view, saved.id) : DEFAULT_FRAME_STATE,
    };
  }

  const { target } = ctx;

  if (
    target &&
    (ref === target.id ||
      ref.replace(/^@/, "").toLowerCase() === target.label?.toLowerCase())
  ) {
    return { frame: target, state: target.state };
  }

  throw new Error(
    `No frame ${ref} on the canvas. Use canvas_list for the frame ids.`
  );
}

export async function resolveShotTarget(
  deps: TargetDeps | null,
  ctx: Pick<AgentRunContext, "project" | "previewUrl" | "target">,
  args: ShotArgs
): Promise<ShotTarget | null> {
  if (!ctx.previewUrl) {
    return null;
  }

  if (args.frame) {
    const { frame, state } = await namedFrame(deps, ctx, args.frame);

    return shotOf(ctx.previewUrl, {
      frameId: frame.id,
      path: args.path === undefined ? frame.path : pathArg(args.path),
      size: { height: frame.height, width: frame.width },
      state: args.state ?? state,
    });
  }

  if (args.path !== undefined) {
    return shotOf(ctx.previewUrl, {
      frameId: null,
      path: pathArg(args.path),
      size: null,
      state: args.state ?? ctx.target?.state ?? DEFAULT_FRAME_STATE,
    });
  }

  return defaultShotTarget(ctx, args.state);
}

function pathArg(raw: string): string {
  const clean = cleanFramePath(raw);

  if (clean === null) {
    throw new Error(
      `path ${raw} is not a page path. Pass a path such as /settings or about.html.`
    );
  }

  return clean;
}

export function isContextFrame(
  ctx: Pick<AgentRunContext, "target">,
  ref: string
): boolean {
  const { target } = ctx;

  if (!target) {
    return false;
  }

  const key = ref.trim();

  return (
    key === target.id ||
    key.replace(/^@/, "").toLowerCase() === target.label?.toLowerCase()
  );
}

export interface EditPage {
  url: string;
  path: string | undefined;
  frameId: string | null;
  size: { width: number; height: number } | null;
}

export function editPage(
  ctx: Pick<AgentRunContext, "previewUrl" | "target">,
  page: string | undefined
): EditPage | null {
  if (!ctx.previewUrl) {
    return null;
  }

  const { target } = ctx;

  if (page !== undefined) {
    return {
      frameId: null,
      path: page,
      size: null,
      url: pageUrl(
        ctx.previewUrl,
        cleanFramePath(page) ?? page,
        target?.state ?? DEFAULT_FRAME_STATE
      ),
    };
  }

  if (!target) {
    return { frameId: null, path: undefined, size: null, url: ctx.previewUrl };
  }

  return {
    frameId: target.id,
    path: target.path || undefined,
    size: { height: target.height, width: target.width },
    url: pageUrl(ctx.previewUrl, target.path, target.state),
  };
}

export function editPageUrl(
  ctx: Pick<AgentRunContext, "previewUrl" | "target">,
  page: string | undefined
): string {
  const found = editPage(ctx, page);

  if (!found) {
    throw new Error("Preview is not running for this direction.");
  }

  return found.url;
}

export async function describeTargetLayout(
  preview: PreviewService,
  ctx: Pick<
    AgentRunContext,
    "project" | "direction" | "previewUrl" | "target" | "request"
  >
): Promise<void> {
  const { target } = ctx;

  if (
    !target ||
    !ctx.previewUrl ||
    !ctx.project.app ||
    ctx.request.mode !== "edit" ||
    target.layout !== undefined
  ) {
    return;
  }

  const [layout, owner] = await Promise.all([
    probeLayout(preview, pageUrl(ctx.previewUrl, target.path, target.state)),
    target.routeFile
      ? pageOwner(ctx.direction.workTree, target.routeFile)
      : Promise.resolve(null),
  ]);

  target.layout = layout;
  target.owner = owner;
}
