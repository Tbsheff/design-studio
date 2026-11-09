import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import type { Direction, McpPoint, Project } from "@design-studio/contracts";
import { cleanRoute, routeLabel } from "@design-studio/contracts/app";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";

import { isOwnAgentRun, toCallClient } from "../platform/call-origin/index.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../platform/errors/index.js";
import type { LinkRuntime } from "./links/link-runtime.js";
import {
  PlaceError,
  findFrame,
  inspectCanvasListing,
  updateCanvasPlacement,
} from "./tools.js";
import type {
  CanvasListing,
  CanvasToolContext,
  PlaceOutcome,
  PlaceSpec,
} from "./tools.js";

interface FrameTarget {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface FramePlaceQuery extends FrameTarget {
  readonly frames: readonly PlaceSpec[];
}

interface FrameAddQuery extends FrameTarget {
  readonly below?: string;
  readonly height?: number;
  readonly label?: string;
  readonly path?: string;
  readonly rightOf?: string;
  readonly viewport?: PlaceSpec["viewport"];
  readonly width?: number;
}

interface FrameRouteQuery {
  readonly below?: string;
  readonly label?: string;
  readonly projectId: string;
  readonly rightOf?: string;
  readonly route: string;
  readonly viewport?: PlaceSpec["viewport"];
}

interface FramePointQuery extends FrameTarget {
  readonly frame: string;
  readonly selector: string | null;
}

interface FrameDeleteQuery {
  readonly frame: string;
  readonly projectId: string;
}

interface FramePointed {
  badge: boolean;
  frame: string;
  label: string | null;
  note: string;
  page: string;
  selector?: string;
  shown: boolean;
}

interface FrameRemoved {
  readonly note: string;
  readonly removed: string;
}

const WARM_TIMEOUT_MS = 180_000;

const RUN_BUSY_TEXT =
  "A studio run is editing this design. Try again when it finishes.";

const BADGE_NOTE =
  "The user sees a badge with a Show button. The view moves only if they click it.";

const NO_BADGE_NOTE =
  "No studio window has this project open, so nobody saw the badge. Tell the user which frame to look at.";

const toNoFrame = (ref: string): NotFoundError =>
  new NotFoundError(
    `No frame ${ref}. Call canvas_list for the ids and labels.`
  );

const toDirection = (
  runtime: LinkRuntime,
  project: Project,
  directionId: string | null
): Direction => {
  if (directionId === null) {
    return runtime.canvas.ownerOf(project);
  }

  const direction = project.directions.find((item) => item.id === directionId);

  if (!direction) {
    throw new NotFoundError(
      `direction ${directionId} not found in project ${project.id}`
    );
  }

  return direction;
};

const getCanvasContext = async (
  runtime: LinkRuntime,
  target: FrameTarget
): Promise<CanvasToolContext> => {
  const project = await runtime.projects.get(target.projectId);

  return {
    canvas: runtime.canvas,
    direction: toDirection(runtime, project, target.directionId),
    mode: "edit",
    plan: false,
    project,
  };
};

const getWritableContext = async (
  runtime: LinkRuntime,
  target: FrameTarget
): Promise<CanvasToolContext> => {
  const context = await getCanvasContext(runtime, target);
  const { direction, project } = context;

  if (
    runtime.runner.isRunning(project.id, direction.id) &&
    !isOwnAgentRun(project.id, direction.id)
  ) {
    throw new ConflictError(RUN_BUSY_TEXT);
  }

  return context;
};

const toPlaced = async (
  context: CanvasToolContext,
  specs: readonly PlaceSpec[],
  seed: boolean
): Promise<PlaceOutcome> => {
  try {
    return await updateCanvasPlacement(context, specs, { seed });
  } catch (error) {
    if (error instanceof PlaceError) {
      throw new BadRequestError(error.message);
    }

    throw error;
  }
};

const inspectCanvasFrames = async (
  runtime: LinkRuntime,
  target: FrameTarget
): Promise<CanvasListing> =>
  inspectCanvasListing(await getCanvasContext(runtime, target));

const updateCanvasFrames = async (
  runtime: LinkRuntime,
  query: FramePlaceQuery
): Promise<PlaceOutcome> =>
  toPlaced(await getWritableContext(runtime, query), query.frames, true);

const toFrameSpec = (query: FrameAddQuery): PlaceSpec => {
  const spec: PlaceSpec = { viewport: query.viewport ?? "desktop" };

  if (query.path) {
    spec.path = query.path.replace(/^\/+/u, "");
  }

  if (query.width) {
    spec.width = query.width;
  }

  if (query.height) {
    spec.height = query.height;
  }

  if (query.label) {
    spec.label = query.label;
  }

  if (query.rightOf) {
    spec.rightOf = query.rightOf;
  }

  if (query.below) {
    spec.below = query.below;
  }

  return spec;
};

const createCanvasFrame = async (
  runtime: LinkRuntime,
  query: FrameAddQuery
): Promise<PlaceOutcome> =>
  toPlaced(
    await getWritableContext(runtime, query),
    [toFrameSpec(query)],
    true
  );

const toRoute = (raw: string): string => {
  const route = cleanRoute(raw);

  if (route === null || /\[|\]/u.test(route)) {
    throw new BadRequestError(
      `Route ${raw} is not a page path. Fill in dynamic segments like [id] first.`
    );
  }

  return route;
};

const toRouteSpec = (query: FrameRouteQuery, route: string): PlaceSpec => {
  const spec: PlaceSpec = {
    label: query.label ?? routeLabel(route),
    path: route.replace(/^\/+/u, ""),
    viewport: query.viewport ?? "desktop",
  };

  if (query.rightOf) {
    spec.rightOf = query.rightOf;
  }

  if (query.below) {
    spec.below = query.below;
  }

  return spec;
};

const startRouteWarm = async (
  runtime: LinkRuntime,
  project: Project,
  route: string
): Promise<boolean> => {
  const apps = runtime.preview?.apps ?? null;

  if (apps === null) {
    return false;
  }

  try {
    const upstream = await apps.ensure(project);

    await fetch(new URL(route, upstream), {
      redirect: "manual",
      signal: AbortSignal.timeout(WARM_TIMEOUT_MS),
    });

    return true;
  } catch {
    return false;
  }
};

const createCanvasRouteFrame = async (
  runtime: LinkRuntime,
  query: FrameRouteQuery
): Promise<PlaceOutcome> => {
  const context = await getWritableContext(runtime, {
    directionId: null,
    projectId: query.projectId,
  });

  if (!context.project.app) {
    throw new BadRequestError(
      "This project is not an attached app. Use add_frame."
    );
  }

  const route = toRoute(query.route);

  void startRouteWarm(runtime, context.project, route);

  return toPlaced(context, [toRouteSpec(query, route)], false);
};

const toPointedFrame = (
  frames: readonly CanvasFileFrame[],
  ref: string
): CanvasFileFrame | null => {
  if (frames.length === 0 && ref === "f1") {
    return null;
  }

  const frame = findFrame(frames, ref);

  if (!frame) {
    throw toNoFrame(ref);
  }

  return frame;
};

const toPointNote = (isBadge: boolean, hasWindow: boolean): string => {
  if (!isBadge) {
    return "Showing the frame on the user's canvas.";
  }

  if (hasWindow) {
    return BADGE_NOTE;
  }

  return NO_BADGE_NOTE;
};

const setPointEvent = (
  runtime: LinkRuntime,
  context: CanvasToolContext,
  frame: CanvasFileFrame | null,
  selector: string
): boolean => {
  const client = toCallClient();
  const frameId = frame?.id ?? "f1";

  if (client === null) {
    if (selector) {
      context.canvas.point(context.project, frameId, selector);
    } else {
      context.canvas.point(context.project, frameId);
    }

    return false;
  }

  const at = Date.now();
  const label = frame?.label ?? frame?.path ?? null;
  const point: McpPoint = { at, client, frameId, label };

  if (selector) {
    point.selector = selector;
  }

  const directionId = context.direction.id;
  const projectId = context.project.id;

  runtime.bus.emit({
    directionId,
    point,
    projectId,
    type: "mcp.point",
  });

  return true;
};

const setCanvasPoint = async (
  runtime: LinkRuntime,
  query: FramePointQuery
): Promise<FramePointed> => {
  const context = await getCanvasContext(runtime, query);
  const { canvas } = await context.canvas.read(context.project);
  const frame = toPointedFrame(canvas?.frames ?? [], query.frame);
  const selector = query.selector?.trim() ?? "";
  const isBadge = setPointEvent(runtime, context, frame, selector);
  const hasWindow = context.canvas.presence(context.project.id) !== null;

  const pointed: FramePointed = {
    badge: hasWindow,
    frame: frame?.id ?? "f1",
    label: frame?.label ?? null,
    note: toPointNote(isBadge, hasWindow),
    page: frame?.path ?? "(entry page)",
    shown: !isBadge,
  };

  if (selector) {
    pointed.selector = selector;
  }

  return pointed;
};

const deleteCanvasFrame = async (
  runtime: LinkRuntime,
  query: FrameDeleteQuery
): Promise<FrameRemoved> => {
  const context = await getWritableContext(runtime, {
    directionId: null,
    projectId: query.projectId,
  });

  const removal = { frame: null as CanvasFileFrame | null };

  await context.canvas.update(
    context.project,
    (file) => {
      const frame = findFrame(file.frames, query.frame);

      if (!frame) {
        return null;
      }

      if (file.frames.length === 1) {
        throw new BadRequestError("The canvas needs at least one frame.");
      }

      removal.frame = frame;

      return {
        ...file,
        frames: file.frames.filter((item) => item.id !== frame.id),
      };
    },
    { source: "agent" }
  );

  if (removal.frame === null) {
    throw toNoFrame(query.frame);
  }

  return {
    note: "The page file stays in the project.",
    removed: removal.frame.id,
  };
};

const toFrameName = (frame: CanvasFileFrame): string => {
  if (frame.label) {
    return `${frame.id} (${frame.label})`;
  }

  return frame.id;
};

const getCanvasDeleteCard = async (
  runtime: LinkRuntime,
  query: FrameDeleteQuery
): Promise<ApprovalCard> => {
  const context = await getCanvasContext(runtime, {
    directionId: null,
    projectId: query.projectId,
  });

  const { canvas } = await context.canvas.read(context.project);
  const frame = findFrame(canvas?.frames ?? [], query.frame);

  if (!frame) {
    throw toNoFrame(query.frame);
  }

  return {
    action: "Remove a canvas frame",
    detail: "The page file stays in the project. Undo brings the frame back.",
    title: `Remove frame ${toFrameName(frame)}`,
  };
};

export {
  createCanvasFrame,
  createCanvasRouteFrame,
  deleteCanvasFrame,
  getCanvasContext,
  getCanvasDeleteCard,
  getWritableContext,
  inspectCanvasFrames,
  setCanvasPoint,
  updateCanvasFrames,
};

export type {
  FrameAddQuery,
  FrameDeleteQuery,
  FramePlaceQuery,
  FramePointQuery,
  FramePointed,
  FrameRemoved,
  FrameRouteQuery,
  FrameTarget,
};
