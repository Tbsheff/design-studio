import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { Direction, Project } from "@design-studio/contracts";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import { Effect } from "effect";

import { listAppRoutes, matchRouteFile } from "../../app/index.js";
import { canvasOwner, findFrame } from "../../canvas/index.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import { getFileHash, getSourceFile } from "./dev-status-hash.js";
import type { StampedFile } from "./engine/to-changed-files.js";

const IMPLICIT_FRAME_ID = "f1";

interface FrameTarget {
  readonly direction: Direction;
  readonly files: readonly StampedFile[];
  readonly page: string | null;
  readonly route: string | null;
}

const toDirection = (
  project: Project,
  frame: CanvasFileFrame | null
): Direction => {
  const owner = frame?.directionId ?? null;

  if (owner !== null) {
    const found = project.directions.find((item) => item.id === owner);

    if (found) {
      return found;
    }
  }

  return canvasOwner(project);
};

const toWantedPage = (project: Project, framePath: string): string => {
  if (framePath === "") {
    return project.entry;
  }

  return framePath;
};

const toPageCandidates = (page: string): string[] => [
  page,
  `${page}.html`,
  `${page}/index.html`,
];

const inspectPageFile = Effect.fn("DevStatusFrame.inspect")(function* run(
  project: Project,
  direction: Direction,
  framePath: string
) {
  if (project.app) {
    const routes = yield* attemptKnown(() =>
      listAppRoutes(direction.workTree, project.app?.appDir ?? "")
    );

    return {
      page: matchRouteFile(routes, `/${framePath}`),
      route: `/${framePath}`,
    };
  }

  const page = yield* getSourceFile(
    direction.workTree,
    toPageCandidates(toWantedPage(project, framePath))
  );

  return { page, route: null };
});

const toStampedFiles = Effect.fn("DevStatusFrame.stamp")(function* run(
  direction: Direction,
  page: string | null
) {
  if (page === null) {
    return [];
  }

  const hash = yield* getFileHash(direction.workTree, page);

  if (hash === null) {
    return [];
  }

  return [{ hash, path: page }];
});

const loadFrameTarget = Effect.fn("DevStatusFrame.load")(function* run(
  project: Project,
  frames: readonly CanvasFileFrame[],
  frameId: string
) {
  const frame = findFrame(frames, frameId);

  if (
    frame === null &&
    !(frames.length === 0 && frameId === IMPLICIT_FRAME_ID)
  ) {
    return yield* new NotFound({
      message: `No frame ${frameId} on the canvas. Use canvas_list for the frame ids.`,
    });
  }

  const direction = toDirection(project, frame);

  const located = yield* inspectPageFile(project, direction, frame?.path ?? "");

  const files = yield* toStampedFiles(direction, located.page);

  const target: FrameTarget = {
    direction,
    files,
    page: located.page,
    route: located.route,
  };

  return target;
});

const toHashPair = Effect.fn("DevStatusFrame.pair")(function* run(
  direction: Direction | null,
  file: StampedFile
) {
  if (direction === null) {
    return [file.path, null] as const;
  }

  const hash = yield* getFileHash(direction.workTree, file.path);

  return [file.path, hash] as const;
});

const listCurrentHashes = Effect.fn("DevStatusFrame.hashes")(function* run(
  direction: Direction | null,
  files: readonly StampedFile[]
) {
  const pairs = yield* Effect.all(
    files.map((file) => toHashPair(direction, file))
  );

  return new Map(pairs);
});

export { listCurrentHashes, loadFrameTarget };

export type { FrameTarget };
