import type { Direction, Project } from "@design-studio/contracts";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import { Effect } from "effect";

import { listAppRoutes, matchRouteFile } from "../../app/index.js";
import { setPrivateJson } from "../../platform/atomic-write/index.js";
import {
  deleteReferencePinShotFile,
  listReferencePins,
  setReferencePinShotFile,
  toReferencePinFile,
  toReferencePinShot,
} from "../../store/index.js";
import type { ReferencePin } from "../../store/index.js";

interface PinPage {
  readonly items: readonly ReferencePin[];
  readonly next: string | null;
}

interface PinFacts {
  readonly direction: Direction;
  readonly frame: CanvasFileFrame;
  readonly screenshotPath: string | null;
  readonly sourcePath: string | null;
}

interface PinTarget {
  readonly frameId: string;
  readonly projectId: string;
}

interface ShotQuery {
  readonly colorScheme: null;
  readonly directionId: null;
  readonly element: null;
  readonly frameId: string;
  readonly height: null;
  readonly isFullPage: false;
  readonly padding: null;
  readonly path: null;
  readonly projectId: string;
  readonly versionId: null;
  readonly width: null;
}

const DEFAULT_HTML_ENTRY = "index.html";

const toPinOffset = (cursor: string | null): number => {
  const parsed = Number(cursor ?? "0");

  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
};

const toPinPage = (
  pins: readonly ReferencePin[],
  cursor: string | null,
  limit: number
): PinPage => {
  const offset = toPinOffset(cursor);
  const end = offset + limit;

  if (end >= pins.length) {
    return { items: pins.slice(offset, end), next: null };
  }

  return { items: pins.slice(offset, end), next: String(end) };
};

const toShotQuery = (pin: PinTarget): ShotQuery => ({
  colorScheme: null,
  directionId: null,
  element: null,
  frameId: pin.frameId,
  height: null,
  isFullPage: false,
  padding: null,
  path: null,
  projectId: pin.projectId,
  versionId: null,
  width: null,
});

const IMPLICIT_FRAME: CanvasFileFrame = {
  height: 900,
  id: "f1",
  order: 0,
  width: 1440,
  x: 0,
  y: 0,
};

const toPinFrame = (
  frames: readonly CanvasFileFrame[],
  frameId: string
): CanvasFileFrame | null => {
  if (frames.length === 0 && frameId === IMPLICIT_FRAME.id) {
    return IMPLICIT_FRAME;
  }

  return frames.find((candidate) => candidate.id === frameId) ?? null;
};

const toPinDirection = (
  directions: readonly Direction[],
  directionId: string
): Direction | null =>
  directions.find((candidate) => candidate.id === directionId) ?? null;

const toReferencePin = (facts: PinFacts): ReferencePin => {
  const framePath = facts.frame.path ?? "";

  return {
    directionId: facts.direction.id,
    id: facts.frame.id,
    name: facts.frame.label ?? (framePath || facts.direction.name),
    path: framePath || null,
    pinnedAt: new Date().toISOString(),
    screenshotPath: facts.screenshotPath,
    sourcePath: facts.sourcePath,
  };
};

const getAppSourcePath = Effect.fn("ReferencePinFile.getAppSourcePath")(
  function* run(workTree: string, appDir: string, framePath: string) {
    const routes = yield* Effect.tryPromise(() =>
      listAppRoutes(workTree, appDir)
    ).pipe(Effect.orElseSucceed(() => []));

    return matchRouteFile(routes, framePath);
  }
);

const getPinSourcePath = (
  project: Project,
  direction: Direction,
  framePath: string
): Effect.Effect<string | null> => {
  if (project.app) {
    return getAppSourcePath(direction.workTree, project.app.appDir, framePath);
  }

  if (project.kind !== "html") {
    return Effect.succeed(null);
  }

  if (framePath !== "") {
    return Effect.succeed(framePath);
  }

  return Effect.succeed(project.entry || DEFAULT_HTML_ENTRY);
};

const getSavedPins = (
  projectId: string
): Effect.Effect<readonly ReferencePin[]> =>
  Effect.promise(() => listReferencePins(projectId));

const setSavedPins = (
  projectId: string,
  pins: readonly ReferencePin[]
): Effect.Effect<void> =>
  setPrivateJson(toReferencePinFile(projectId), { pins });

const setPinShot = (
  projectId: string,
  pinId: string,
  pngBase64: string | null
): Effect.Effect<string | null> => {
  if (pngBase64 === null) {
    return Effect.succeed(null);
  }

  return Effect.tryPromise(() =>
    setReferencePinShotFile(toReferencePinShot(projectId, pinId), pngBase64)
  ).pipe(Effect.orElseSucceed(() => null));
};

const deletePinShot = (projectId: string, pinId: string): Effect.Effect<void> =>
  Effect.promise(() =>
    deleteReferencePinShotFile(toReferencePinShot(projectId, pinId))
  );

export {
  deletePinShot,
  getPinSourcePath,
  getSavedPins,
  setPinShot,
  setSavedPins,
  toPinPage,
  toPinDirection,
  toPinFrame,
  toReferencePin,
  toShotQuery,
};

export type { PinPage };
