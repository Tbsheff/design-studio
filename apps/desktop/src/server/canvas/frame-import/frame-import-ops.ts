import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";
import { CANVAS_FILE } from "@design-studio/contracts/canvas-file";
import type {
  CanvasFile,
  CanvasFileFrame,
} from "@design-studio/contracts/canvas-file";
import { toImageFrameSize } from "@design-studio/contracts/image-frame";

import { publishVersion, writeNewFile } from "../../direct-edit/index.js";
import type { DirectEditRuntime } from "../../direct-edit/index.js";
import { isOwnAgentRun } from "../../platform/call-origin/index.js";
import { BadRequestError, ConflictError } from "../../platform/errors/index.js";
import {
  toFreePagePath,
  toLinkedPage,
  toPageSlug,
} from "../linked-frame/engine/to-linked-page.js";
import { framesOf } from "../links/link-tools.js";
import { canvasOwner } from "../service.js";
import { applyPlacement, CANVAS_VIEWPORTS } from "../tools.js";
import type { CanvasToolContext } from "../tools.js";
import { toImageSize } from "./engine/to-image-size.js";
import type { ImageSize } from "./engine/to-image-size.js";
import { toImportName, toNearestFrame } from "./engine/to-import-spot.js";

interface FrameImportQuery {
  readonly imagePath: string | null;
  readonly name: string | null;
  readonly x: number | null;
  readonly y: number | null;
}

interface FrameImportTarget {
  readonly direction: Direction;
  readonly project: Project;
  readonly runtime: DirectEditRuntime;
}

interface FrameImportWritten {
  readonly directionId: string;
  readonly frameId: string;
  readonly name: string;
  readonly path: string;
  readonly sourcePath: string | null;
}

interface ImportSource {
  readonly frame: CanvasFileFrame | null;
  readonly html: string;
  readonly sourcePath: string | null;
}

interface TextChange {
  readonly after: string;
  readonly before: string;
  readonly created: boolean;
  readonly file: string;
  readonly relative: string;
}

const CLIENT = "ui";

const APP_TEXT =
  "This project is an app. Use create_screen to add a screen to the app.";

const RUN_BUSY =
  "An agent run is editing this direction. Wait for it to end, then import the screen.";

const toEntryPage = (frame: CanvasFileFrame): string => {
  const clean = (frame.path ?? "").split(/[?#]/u)[0]?.replace(/^\/+/u, "");

  if (!clean) {
    return "index.html";
  }

  if (clean.endsWith("/")) {
    return `${clean}index.html`;
  }

  return clean;
};

const toReadText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const toCheckTarget = (target: FrameImportTarget): void => {
  const { direction, project, runtime } = target;

  if (project.app || project.kind !== "html") {
    throw new BadRequestError(APP_TEXT);
  }

  if (canvasOwner(project).id !== direction.id) {
    throw new BadRequestError(
      "Import screens in the direction that owns the canvas. Pass directionId null."
    );
  }

  if (
    runtime.editDeps.runner.isRunning(project.id, direction.id) &&
    !isOwnAgentRun(project.id, direction.id)
  ) {
    throw new ConflictError(RUN_BUSY);
  }
};

const toContext = (target: FrameImportTarget): CanvasToolContext => ({
  canvas: target.runtime.canvas,
  direction: target.direction,
  mode: "edit",
  plan: false,
  project: target.project,
});

const toSource = async (
  target: FrameImportTarget,
  query: FrameImportQuery
): Promise<ImportSource> => {
  const frames = await framesOf(toContext(target));
  const frame = toNearestFrame(frames, query.x, query.y);

  if (frame === null) {
    return { frame: null, html: "", sourcePath: null };
  }

  const sourcePath = toEntryPage(frame);

  const html = await toReadText(
    path.join(target.direction.workTree, sourcePath)
  );

  if (html === null) {
    return { frame, html: "", sourcePath: null };
  }

  return { frame, html, sourcePath };
};

const toTakenNames = async (workTree: string): Promise<Set<string>> => {
  try {
    return new Set(await readdir(workTree));
  } catch {
    return new Set();
  }
};

const toNewPagePath = async (
  target: FrameImportTarget,
  name: string
): Promise<string> => {
  const taken = await toTakenNames(target.direction.workTree);
  const free = toFreePagePath(toPageSlug(name), taken);

  if (free === null) {
    throw new ConflictError("No free page name. Pass another name.");
  }

  return free;
};

const toCanvasText = (direction: Direction): Promise<string | null> =>
  toReadText(path.join(direction.workTree, ...CANVAS_FILE.split("/")));

const toWithEntryFrame = (
  file: CanvasFile,
  directionId: string
): CanvasFile => {
  if (file.frames.length > 0) {
    return file;
  }

  return applyPlacement(file, [{ ...CANVAS_VIEWPORTS.desktop }], directionId)
    .file;
};

const toFrameSize = (
  source: ImportSource,
  image: ImageSize | null
): ImageSize => {
  if (image !== null) {
    return toImageFrameSize(image);
  }

  return source.frame ?? CANVAS_VIEWPORTS.desktop;
};

const toPlaceSpec = (
  source: ImportSource,
  query: FrameImportQuery,
  written: { readonly label: string; readonly pagePath: string },
  image: ImageSize | null
): Parameters<typeof applyPlacement>[1][number] => {
  const size = toFrameSize(source, image);
  const { label, pagePath } = written;
  const named = { label, path: pagePath };

  const base = { ...named, height: size.height, width: size.width };

  if (query.x === null || query.y === null) {
    return base;
  }

  return { ...base, x: query.x, y: query.y };
};

const toFileImageSize = async (
  imagePath: string | null
): Promise<ImageSize | null> => {
  if (imagePath === null) {
    return null;
  }

  try {
    const found = toImageSize(new Uint8Array(await readFile(imagePath)));

    if (found.ok) {
      return found.value;
    }

    return null;
  } catch {
    return null;
  }
};

const toPlacedFrame = async (
  target: FrameImportTarget,
  source: ImportSource,
  query: FrameImportQuery,
  written: { readonly label: string; readonly pagePath: string }
): Promise<CanvasFileFrame> => {
  let placed: CanvasFileFrame | null = null;
  const image = await toFileImageSize(query.imagePath);
  const spec = toPlaceSpec(source, query, written, image);

  await target.runtime.canvas.update(
    target.project,
    (file) => {
      const seeded = toWithEntryFrame(file, target.direction.id);
      const next = applyPlacement(seeded, [spec], target.direction.id);

      placed = next.placed[0] ?? null;

      return next.file;
    },
    { source: "run" }
  );

  const frame: CanvasFileFrame | null = placed;

  if (frame === null) {
    throw new BadRequestError("The canvas frame was not added.");
  }

  return frame;
};

const toChange = (
  direction: Direction,
  relative: string,
  before: string | null,
  after: string | null
): TextChange => ({
  after: after ?? "",
  before: before ?? "",
  created: before === null,
  file: path.join(direction.workTree, ...relative.split("/")),
  relative,
});

const toCommit = async (
  target: FrameImportTarget,
  pagePath: string,
  changes: readonly TextChange[]
): Promise<void> => {
  const { direction, project, runtime } = target;
  const deps = runtime.editDeps;
  const stepLabel = `Import screen ${pagePath}`;

  const version = await deps.versions.commitFile(
    project,
    direction,
    [pagePath, CANVAS_FILE],
    stepLabel,
    { client: CLIENT, kind: "manual", prompt: `${stepLabel} by ${CLIENT}` }
  );

  if (version === null) {
    return;
  }

  deps.history?.record({
    directionId: direction.id,
    files: [...changes],
    label: stepLabel,
    projectId: project.id,
    versionId: version.id,
  });

  await publishVersion(deps, project, direction, version);
};

const createImportedFrame = async (
  target: FrameImportTarget,
  query: FrameImportQuery
): Promise<FrameImportWritten> => {
  toCheckTarget(target);

  const { direction } = target;
  const source = await toSource(target, query);
  const label = toImportName(query.name);

  const [pagePath, canvasBefore] = await Promise.all([
    toNewPagePath(target, label),
    toCanvasText(direction),
  ]);

  const page = toLinkedPage(source.html, label);

  await writeNewFile(path.join(direction.workTree, pagePath), page);

  const frame = await toPlacedFrame(target, source, query, {
    label,
    pagePath,
  });

  await toCommit(target, pagePath, [
    toChange(direction, pagePath, null, page),
    toChange(
      direction,
      CANVAS_FILE,
      canvasBefore,
      await toCanvasText(direction)
    ),
  ]);

  return {
    directionId: direction.id,
    frameId: frame.id,
    name: label,
    path: pagePath,
    sourcePath: source.sourcePath,
  };
};

const toImageBytes = async (file: string): Promise<Uint8Array> =>
  new Uint8Array(await readFile(file));

export { createImportedFrame, toImageBytes };

export type { FrameImportQuery, FrameImportTarget, FrameImportWritten };
