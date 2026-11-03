import { cleanRoute, routeLabel } from "../../../shared/app.js";
import type { CanvasFileFrame } from "../../../shared/canvas-file.js";
import { canvasPlace, findFrame } from "../../canvas/tools.js";
import type { CanvasToolContext, PlaceSpec } from "../../canvas/tools.js";
import { frameStepText, placedFrames, placeSummary } from "../activity-text.js";
import { EditError, loadTarget, refuseWhileRunning } from "../edit-guards.js";
import type { EditDeps } from "../edit-guards.js";
import { ok } from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import type { ToolResult } from "../tool-types.js";
import {
  pointEvent,
  pointMessage,
  pointResult,
  removedResult,
} from "./canvas-result.js";
import type {
  AddFrameInput,
  AddRouteFrameInput,
  CanvasPointInput,
  RemoveFrameInput,
} from "./canvas-schema.js";

interface CanvasTarget {
  projectId: string;
  directionId?: string;
}

interface Removal {
  frame: CanvasFileFrame | null;
}

interface PlaceOptions {
  seed?: boolean;
}

const WARM_TIMEOUT_MS = 180_000;

const BADGE_NOTE =
  "The user sees a badge with a Show button. The view moves only if they click it.";

const NO_BADGE_NOTE =
  "No studio window has this project open, so nobody saw the badge. Tell the user which frame to look at.";

const noFrame = (ref: string): EditError =>
  new EditError(`No frame ${ref}. Call canvas_list for the ids and labels.`);

const canvasContext = async (
  deps: EditDeps,
  input: CanvasTarget
): Promise<CanvasToolContext> => {
  const target = await loadTarget(deps, input.projectId, input.directionId);

  return { ...target, canvas: deps.canvas, mode: "edit", plan: false };
};

const busyCanvas = async (
  deps: EditDeps,
  input: CanvasTarget
): Promise<CanvasToolContext> => {
  const ctx = await canvasContext(deps, input);

  refuseWhileRunning(deps, ctx.project, ctx.direction);

  return ctx;
};

const readFrames = async (
  ctx: CanvasToolContext
): Promise<CanvasFileFrame[]> => {
  const file = await ctx.canvas.read(ctx.project);

  return file.canvas?.frames ?? [];
};

const pointedFrame = (
  frames: readonly CanvasFileFrame[],
  ref: string
): CanvasFileFrame | null => {
  if (frames.length === 0 && ref === "f1") {
    return null;
  }

  const frame = findFrame(frames, ref);

  if (!frame) {
    throw noFrame(ref);
  }

  return frame;
};

const badgeNote = (badge: boolean): string => {
  if (badge) {
    return BADGE_NOTE;
  }

  return NO_BADGE_NOTE;
};

const pointFrame = async (
  deps: EditDeps,
  ctx: CanvasToolContext,
  input: CanvasPointInput,
  client: string
): Promise<ToolResult> => {
  const frames = await readFrames(ctx);

  const frame = pointedFrame(frames, input.frame);

  const sel = input.selector?.trim() ?? "";

  deps.bus.emit(
    pointMessage(
      { directionId: ctx.direction.id, projectId: ctx.project.id },
      pointEvent(frame, client, sel)
    )
  );

  const badge = deps.canvas.presence(ctx.project.id) !== null;

  const note = badgeNote(badge);

  return ok(pointResult(frame, { badge, note, sel }));
};

const addedText = (placed: readonly CanvasFileFrame[]): string => {
  if (placed.length === 1) {
    return frameStepText("Add", placed[0], "a frame");
  }

  return `Add ${placed.length} frames`;
};

const placeText = (
  verb: string | null,
  specs: readonly PlaceSpec[],
  placed: readonly CanvasFileFrame[],
  after: readonly CanvasFileFrame[]
): string => {
  if (verb === null || specs.every((spec) => !spec.frame)) {
    return addedText(placed);
  }

  return placeSummary(verb, specs, placed, after);
};

const placeWithActivity = async (
  ctx: CanvasToolContext,
  specs: PlaceSpec[],
  verb: string | null,
  options: PlaceOptions = {}
): Promise<Done> => {
  const before = await readFrames(ctx);

  const placing = canvasPlace(ctx, specs, options);

  const result = await placing;

  if (result.isError) {
    return { result };
  }

  const after = await readFrames(ctx);

  const placed = placedFrames(specs, before, after);

  return {
    activity: {
      directionId: ctx.direction.id,
      frameId: placed[0]?.id ?? null,
      projectId: ctx.project.id,
      summary: placeText(verb, specs, placed, after),
    },
    result,
  };
};

const frameSpec = (input: AddFrameInput): PlaceSpec => {
  const spec: PlaceSpec = { viewport: input.viewport ?? "desktop" };

  if (input.path) {
    spec.path = input.path;
  }

  if (input.width) {
    spec.width = input.width;
  }

  if (input.height) {
    spec.height = input.height;
  }

  if (input.label) {
    spec.label = input.label;
  }

  if (input.rightOf) {
    spec.rightOf = input.rightOf;
  }

  if (input.below) {
    spec.below = input.below;
  }

  return spec;
};

const addFrame = async (
  deps: EditDeps,
  input: AddFrameInput
): Promise<Done> => {
  const ctx = await busyCanvas(deps, input);

  return placeWithActivity(ctx, [frameSpec(input)], null);
};

const removeFrame = async (
  deps: EditDeps,
  input: RemoveFrameInput
): Promise<Done> => {
  const ctx = await busyCanvas(deps, input);

  const removal: Removal = { frame: null };

  await deps.canvas.update(
    ctx.project,
    (file) => {
      const frame = findFrame(file.frames, input.frame);

      if (!frame) {
        return null;
      }

      if (file.frames.length === 1) {
        throw new EditError("The canvas needs at least one frame.");
      }

      removal.frame = frame;

      return {
        ...file,
        frames: file.frames.filter((item) => item.id !== frame.id),
      };
    },
    { source: "agent" }
  );

  const gone = removal.frame;

  if (!gone) {
    throw noFrame(input.frame);
  }

  return {
    activity: {
      directionId: ctx.direction.id,
      frameId: gone.id,
      projectId: ctx.project.id,
      summary: frameStepText("Remove", gone, input.frame),
    },
    result: ok(removedResult(gone.id)),
  };
};

const routeOf = (input: AddRouteFrameInput): string => {
  const route = cleanRoute(input.route);

  if (route === null || /\[|\]/u.test(route)) {
    throw new EditError(
      `Route ${input.route} is not a page path. Fill in dynamic segments like [id] first.`
    );
  }

  return route;
};

const routeSpec = (input: AddRouteFrameInput, route: string): PlaceSpec => {
  const spec: PlaceSpec = {
    label: input.label ?? routeLabel(route),
    path: route.replace(/^\/+/u, ""),
    viewport: input.viewport ?? "desktop",
  };

  if (input.rightOf) {
    spec.rightOf = input.rightOf;
  }

  if (input.below) {
    spec.below = input.below;
  }

  return spec;
};

const warmRoute = async (
  deps: EditDeps,
  ctx: CanvasToolContext,
  route: string
): Promise<boolean> => {
  const { apps } = deps.preview;

  if (!apps) {
    return false;
  }

  try {
    const upstream = await apps.ensure(ctx.project);

    await fetch(new URL(route, upstream), {
      redirect: "manual",
      signal: AbortSignal.timeout(WARM_TIMEOUT_MS),
    });

    return true;
  } catch {
    return false;
  }
};

const addRouteFrame = async (
  deps: EditDeps,
  input: AddRouteFrameInput
): Promise<Done> => {
  const ctx = await busyCanvas(deps, input);

  if (!ctx.project.app) {
    throw new EditError("This project is not an attached app. Use add_frame.");
  }

  const route = routeOf(input);

  const spec = routeSpec(input, route);

  void warmRoute(deps, ctx, route);

  return placeWithActivity(ctx, [spec], null, { seed: false });
};

export {
  addFrame,
  addRouteFrame,
  busyCanvas,
  canvasContext,
  placeWithActivity,
  pointFrame,
  removeFrame,
};
