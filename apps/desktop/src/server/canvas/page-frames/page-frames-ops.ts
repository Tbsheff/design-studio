import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";
import { CANVAS_FILE } from "@design-studio/contracts/canvas-file";
import type {
  CanvasFile,
  CanvasFileFrame,
} from "@design-studio/contracts/canvas-file";
import { toLinkedSpot } from "@design-studio/contracts/linked-frame";
import { LINKS_FILE } from "@design-studio/contracts/links";
import type { LinksFile } from "@design-studio/contracts/links";
import {
  toStartPoints,
  withFirstStart,
} from "@design-studio/contracts/start-points";

import { publishVersion } from "../../direct-edit/index.js";
import type { DirectEditRuntime } from "../../direct-edit/index.js";
import { isOwnAgentRun } from "../../platform/call-origin/index.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../platform/errors/index.js";
import { canvasOwner } from "../service.js";
import { applyPlacement, CANVAS_VIEWPORTS, findFrame } from "../tools.js";
import { toPageFramePlan, toPageLabels } from "./engine/to-page-frames.js";
import type { PageFramePlan } from "./engine/to-page-frames.js";
import { toPageLinks, toPageTexts } from "./page-reader.js";
import type { PageTexts } from "./page-reader.js";

interface PageFramesQuery {
  readonly fromFrame: string | null;
  readonly pages: readonly string[] | null;
}

interface PageFramesTarget {
  readonly direction: Direction;
  readonly project: Project;
  readonly runtime: DirectEditRuntime;
}

interface PageFrameMade {
  readonly id: string;
  readonly label: string;
  readonly page: string;
}

interface PageFramesWritten {
  readonly frames: readonly PageFrameMade[];
  readonly startFrame: string | null;
}

interface PlacedOne {
  readonly file: CanvasFile;
  readonly frame: CanvasFileFrame | null;
}

interface PlannedFile {
  readonly file: CanvasFile;
  readonly made: readonly PageFrameMade[];
}

interface StartFrame {
  readonly before: string | null;
  readonly start: string | null;
}

interface FileChange {
  readonly after: string;
  readonly before: string;
  readonly created: boolean;
  readonly file: string;
  readonly relative: string;
}

interface PlacedPages {
  readonly made: readonly PageFrameMade[];
  readonly canvasBefore: string | null;
}

const PAGE_FRAME_GAP = 80;

const CLIENT = "ui";

const APP_TEXT =
  "This project is an app. Use canvas_place to add a frame for a route.";

const RUN_BUSY =
  "An agent run is editing this direction. Wait for it to end, then add the frames.";

const PAGE_FILE = /\.html?$/iu;

const ENTRY_PAGE = "index.html";

const toPagePath = (value: string): string => {
  const clean = value.split(/[?#]/u)[0]?.replace(/^\/+/u, "");

  if (!clean) {
    return ENTRY_PAGE;
  }

  if (clean.endsWith("/")) {
    return `${clean}index.html`;
  }

  if (PAGE_FILE.test(clean)) {
    return clean;
  }

  return `${clean}.html`;
};

const toFramePage = (frame: CanvasFileFrame): string =>
  toPagePath(frame.path ?? "");

const toCheckTarget = (target: PageFramesTarget): void => {
  const { direction, project, runtime } = target;

  if (project.app || project.kind !== "html") {
    throw new BadRequestError(APP_TEXT);
  }

  if (canvasOwner(project).id !== direction.id) {
    throw new BadRequestError(
      "Add page frames in the direction that owns the canvas. Pass directionId null."
    );
  }

  if (
    runtime.editDeps.runner.isRunning(project.id, direction.id) &&
    !isOwnAgentRun(project.id, direction.id)
  ) {
    throw new ConflictError(RUN_BUSY);
  }
};

const toReadText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const toCanvasText = (direction: Direction): Promise<string | null> =>
  toReadText(path.join(direction.workTree, ...CANVAS_FILE.split("/")));

const toOwnFrames = (
  frames: readonly CanvasFileFrame[],
  directionId: string
): CanvasFileFrame[] =>
  frames.filter((frame) => (frame.directionId ?? directionId) === directionId);

const toWithEntryFrame = (
  file: CanvasFile,
  entryLabel: string | null,
  directionId: string
): CanvasFile => {
  if (file.frames.length > 0) {
    return file;
  }

  const spec = { ...CANVAS_VIEWPORTS.desktop };

  if (entryLabel === null) {
    return applyPlacement(file, [spec], directionId).file;
  }

  return applyPlacement(file, [{ ...spec, label: entryLabel }], directionId)
    .file;
};

const toRoots = (
  frames: readonly CanvasFileFrame[],
  fromFrame: string | null
): string[] => {
  if (fromFrame === null) {
    return frames
      .toSorted((left, right) => left.x - right.x || left.y - right.y)
      .map((frame) => toFramePage(frame));
  }

  const frame = findFrame(frames, fromFrame);

  if (frame === null) {
    throw new NotFoundError(
      `No frame ${fromFrame}. Call canvas_list for the ids and labels.`
    );
  }

  return [toFramePage(frame)];
};

const toAllowed = (pages: readonly string[] | null): Set<string> | null => {
  if (pages === null) {
    return null;
  }

  return new Set(pages.map((page) => toPagePath(page)));
};

const toSourceFrame = (
  frames: readonly CanvasFileFrame[],
  page: string
): CanvasFileFrame | null => {
  const matches = frames.filter((frame) => toFramePage(frame) === page);
  const shown = matches.filter((frame) => frame.hidden !== true);

  return shown.at(-1) ?? matches.at(-1) ?? null;
};

const toPlacedOne = (
  file: CanvasFile,
  item: PageFramePlan,
  frameLabel: string,
  directionId: string
): PlacedOne => {
  const own = toOwnFrames(file.frames, directionId);
  const source = toSourceFrame(own, item.from);

  if (source === null) {
    return { file, frame: null };
  }

  const spot = toLinkedSpot(own, source);

  const next = applyPlacement(
    file,
    [
      {
        gap: PAGE_FRAME_GAP,
        height: source.height,
        label: frameLabel,
        path: item.page,
        rightOf: spot.neighborId,
        width: source.width,
      },
    ],
    directionId
  );

  return { file: next.file, frame: next.placed[0] ?? null };
};

const toPlannedFile = (
  file: CanvasFile,
  query: PageFramesQuery,
  texts: PageTexts,
  directionId: string
): PlannedFile => {
  const labels = toPageLabels(
    [...texts.pages].map(([page, text]) => ({ html: text.html, page }))
  );

  const entryLabel = labels.get(ENTRY_PAGE) ?? null;
  const seeded = toWithEntryFrame(file, entryLabel, directionId);
  const own = toOwnFrames(seeded.frames, directionId);

  const plan = toPageFramePlan({
    allowed: toAllowed(query.pages),
    framed: own.map((frame) => toFramePage(frame)),
    links: toPageLinks(texts),
    roots: toRoots(own, query.fromFrame),
  });

  let next = seeded;
  const made: PageFrameMade[] = [];

  for (const item of plan) {
    const frameLabel = labels.get(item.page) ?? item.page;
    const placed = toPlacedOne(next, item, frameLabel, directionId);

    next = placed.file;

    if (placed.frame !== null) {
      made.push({ id: placed.frame.id, label: frameLabel, page: item.page });
    }
  }

  return { file: next, made };
};

const toPlacedPages = async (
  target: PageFramesTarget,
  query: PageFramesQuery,
  texts: PageTexts
): Promise<PlacedPages> => {
  const canvasBefore = await toCanvasText(target.direction);
  let made: readonly PageFrameMade[] = [];

  await target.runtime.canvas.update(
    target.project,
    (file) => {
      const planned = toPlannedFile(file, query, texts, target.direction.id);

      ({ made } = planned);

      if (made.length === 0) {
        return null;
      }

      return planned.file;
    },
    { source: "run" }
  );

  return { canvasBefore, made };
};

const toEntryFrameId = (
  frames: readonly CanvasFileFrame[],
  directionId: string
): string | null => {
  const own = toOwnFrames(frames, directionId);
  const entry = own.find((frame) => toFramePage(frame) === ENTRY_PAGE);

  return entry?.id ?? own[0]?.id ?? null;
};

const toStartFrame = async (
  target: PageFramesTarget,
  hasNewFrames: boolean
): Promise<StartFrame> => {
  const { direction, project, runtime } = target;
  const linksPath = path.join(direction.workTree, ...LINKS_FILE.split("/"));

  const [before, current] = await Promise.all([
    toReadText(linksPath),
    runtime.canvas.links.read(project),
  ]);

  const [first = null] = toStartPoints(current);

  if (first !== null || !hasNewFrames) {
    return { before, start: first?.frame ?? null };
  }

  const snapshot = await runtime.canvas.read(project);
  const entry = toEntryFrameId(snapshot.canvas?.frames ?? [], direction.id);

  if (entry === null) {
    return { before, start: null };
  }

  await runtime.canvas.links.update(
    project,
    (file): LinksFile => withFirstStart(file, entry),
    "run"
  );

  return { before, start: entry };
};

const toChange = (
  direction: Direction,
  relative: string,
  before: string | null,
  after: string | null
): FileChange => ({
  after: after ?? "",
  before: before ?? "",
  created: before === null,
  file: path.join(direction.workTree, ...relative.split("/")),
  relative,
});

const toStepLabel = (count: number): string => {
  if (count === 1) {
    return "Add 1 page frame";
  }

  return `Add ${count} page frames`;
};

const toCommit = async (
  target: PageFramesTarget,
  placed: PlacedPages,
  linksBefore: string | null
): Promise<void> => {
  const { direction, project, runtime } = target;
  const deps = runtime.editDeps;
  const linksPath = path.join(direction.workTree, ...LINKS_FILE.split("/"));
  const linksAfter = await toReadText(linksPath);
  const isLinksChanged = linksAfter !== linksBefore;
  const files = [CANVAS_FILE];

  if (isLinksChanged) {
    files.push(LINKS_FILE);
  }

  const stepLabel = toStepLabel(placed.made.length);

  const version = await deps.versions.commitFile(
    project,
    direction,
    files,
    stepLabel,
    { client: CLIENT, kind: "manual", prompt: `${stepLabel} by ${CLIENT}` }
  );

  if (version === null) {
    return;
  }

  const changes = [
    toChange(
      direction,
      CANVAS_FILE,
      placed.canvasBefore,
      await toCanvasText(direction)
    ),
  ];

  if (isLinksChanged) {
    changes.push(toChange(direction, LINKS_FILE, linksBefore, linksAfter));
  }

  deps.history?.record({
    directionId: direction.id,
    files: changes,
    label: stepLabel,
    projectId: project.id,
    versionId: version.id,
  });

  await publishVersion(deps, project, direction, version);
};

const createPageFrames = async (
  target: PageFramesTarget,
  query: PageFramesQuery
): Promise<PageFramesWritten> => {
  toCheckTarget(target);

  const texts = await toPageTexts(target.direction.workTree);
  const placed = await toPlacedPages(target, query, texts);
  const hasNewFrames = placed.made.length > 0;
  const start = await toStartFrame(target, hasNewFrames);

  if (hasNewFrames) {
    await toCommit(target, placed, start.before);
  }

  return { frames: placed.made, startFrame: start.start };
};

export { createPageFrames };

export type {
  PageFrameMade,
  PageFramesQuery,
  PageFramesTarget,
  PageFramesWritten,
};
