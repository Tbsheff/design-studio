import path from "node:path";

import { collectAssets, copyAssets } from "./assets.js";
import { capturePage } from "./capture.js";
import type { Capture, CapturedNode } from "./captured.js";
import {
  CANVAS_FILE,
  canvasOwner,
  firstVersionBlock,
  PAGE_IMPORT_DEADLINE_MS,
  PAGE_IMPORT_NOTE,
  publishVersion,
  tokenEntriesFor,
  writeNewFile,
} from "./deps.js";
import type {
  CanvasService,
  DirectEditDeps,
  Direction,
  EditRecorder,
  PageImportRequest,
  PageImportResult,
  Project,
  Version,
} from "./deps.js";
import { PageImportError } from "./errors.js";
import { freeSlug, nameFor } from "./page-file.js";
import { placeFrame } from "./place-frame.js";
import type { FramePlacement, PlaceSource } from "./place-frame.js";
import { renderPage } from "./render.js";
import { buildClassSheet } from "./styles.js";
import { toTargetUrl } from "./target-url.js";

const FIRST_VERSION_WAIT_MS = 20_000;

const LABEL_MAX = 40;

const DESKTOP_MIN = 1024;

const TABLET_MIN = 768;

const DESKTOP_HEIGHT = 900;

const TABLET_HEIGHT = 1024;

const MOBILE_HEIGHT = 844;

interface ImportTarget {
  readonly project: Project;
  readonly direction: Direction;
  readonly canvas: CanvasService;
}

interface ImportCommit {
  readonly deps: DirectEditDeps;
  readonly history: EditRecorder | null;
  readonly client: string;
}

interface ImportOutcome {
  readonly result: PageImportResult;
  readonly version: Version | null;
}

interface WrittenPage {
  readonly page: string;
  readonly html: string;
  readonly title: string;
  readonly assets: readonly string[];
  readonly skipped: readonly string[];
  readonly classes: number;
  readonly tokens: number;
}

interface FileChange {
  readonly file: string;
  readonly relative: string;
  readonly before: string;
  readonly after: string;
  readonly created: boolean;
}

const heightFor = (width: number): number => {
  if (width >= DESKTOP_MIN) {
    return DESKTOP_HEIGHT;
  }

  if (width >= TABLET_MIN) {
    return TABLET_HEIGHT;
  }

  return MOBILE_HEIGHT;
};

const checkTarget = async (target: ImportTarget): Promise<void> => {
  if (target.project.app || target.project.kind !== "html") {
    throw new PageImportError(
      "import_page writes a static HTML page, so it works only in HTML projects. Create an HTML project for the copy."
    );
  }

  if (canvasOwner(target.project).id !== target.direction.id) {
    throw new PageImportError(
      "Import pages into the main direction of the project, where the canvas lives."
    );
  }

  const blocked = await firstVersionBlock(
    target.project,
    FIRST_VERSION_WAIT_MS
  );

  if (blocked) {
    throw new PageImportError(blocked);
  }
};

const rootOf = (capture: Capture): CapturedNode => {
  if (capture.page.root === null) {
    throw new PageImportError("The page had nothing to copy.");
  }

  return capture.page.root;
};

const titleOf = (capture: Capture): string =>
  capture.page.title.trim() || new URL(capture.page.url).host;

const writePage = async (
  target: ImportTarget,
  request: PageImportRequest,
  capture: Capture,
  isLoopbackAllowed: boolean
): Promise<WrittenPage> => {
  const rootNode = rootOf(capture);
  const { workTree } = target.direction;
  const pageTitle = titleOf(capture);
  const wanted = nameFor(request.name, pageTitle, capture.page.url);

  const [slug, entries] = await Promise.all([
    freeSlug(workTree, wanted),
    tokenEntriesFor(target.project, target.direction),
  ]);

  const classSheet = buildClassSheet(rootNode, entries);

  const files = await copyAssets(
    collectAssets(rootNode, capture.page.fontFaces),
    {
      allowLoopback: isLoopbackAllowed,
      deadline: Date.now() + PAGE_IMPORT_DEADLINE_MS,
      folder: `assets/${slug}`,
      kept: capture.kept,
      workTree: target.direction.workTree,
    }
  );

  const markup = renderPage({
    isRegion: request.selector !== null,
    local: files.local,
    page: capture.page,
    root: rootNode,
    sheet: classSheet,
    sourceUrl: capture.page.url,
  });

  const pageFile = `${slug}.html`;

  await writeNewFile(path.join(workTree, pageFile), markup);

  return {
    assets: files.written,
    classes: classSheet.rules.length,
    html: markup,
    page: pageFile,
    skipped: files.skipped,
    title: pageTitle,
    tokens: classSheet.tokens,
  };
};

const removedList = (capture: Capture): string[] =>
  Object.entries(capture.page.removed).map(
    ([what, count]) => `${what} x${count}`
  );

const canvasChange = (
  direction: Direction,
  placement: FramePlacement
): FileChange => ({
  after: placement.after ?? "",
  before: placement.before ?? "",
  created: placement.before === null,
  file: path.join(direction.workTree, ...CANVAS_FILE.split("/")),
  relative: CANVAS_FILE,
});

const pageChange = (
  direction: Direction,
  written: WrittenPage
): FileChange => ({
  after: written.html,
  before: "",
  created: true,
  file: path.join(direction.workTree, written.page),
  relative: written.page,
});

const commitImport = async (
  target: ImportTarget,
  written: WrittenPage,
  placement: FramePlacement,
  commit: ImportCommit
): Promise<Version | null> => {
  const { project, direction } = target;
  const stepLabel = `Import page ${written.page}`;

  const version = await commit.deps.versions.commitFile(
    project,
    direction,
    [written.page, ...written.assets, CANVAS_FILE],
    stepLabel,
    {
      client: commit.client,
      kind: "manual",
      prompt: `${stepLabel} by ${commit.client}`,
    }
  );

  if (version === null) {
    return null;
  }

  commit.history?.record({
    directionId: direction.id,
    files: [pageChange(direction, written), canvasChange(direction, placement)],
    label: stepLabel,
    projectId: project.id,
    versionId: version.id,
  });
  await publishVersion(commit.deps, project, direction, version);

  return version;
};

const sourceOf = (commit: ImportCommit | null): PlaceSource => {
  if (commit === null) {
    return "agent";
  }

  return "run";
};

const saveImport = (
  target: ImportTarget,
  written: WrittenPage,
  placement: FramePlacement,
  commit: ImportCommit | null
): Promise<Version | null> => {
  if (commit === null) {
    return Promise.resolve(null);
  }

  return commitImport(target, written, placement, commit);
};

const resultOf = (
  capture: Capture,
  written: WrittenPage,
  placement: FramePlacement,
  version: Version | null
): PageImportResult => ({
  assets: written.assets,
  classes: written.classes,
  elements: capture.page.nodes,
  frameId: placement.frame.id,
  height: placement.frame.height,
  note: PAGE_IMPORT_NOTE,
  page: written.page,
  removed: removedList(capture),
  skippedAssets: written.skipped,
  sourceUrl: capture.page.url,
  title: written.title,
  tokens: written.tokens,
  truncated: capture.page.truncated,
  versionId: version?.id ?? null,
  width: placement.frame.width,
});

const importPageCopy = async (
  target: ImportTarget,
  request: PageImportRequest,
  commit: ImportCommit | null
): Promise<ImportOutcome> => {
  await checkTarget(target);

  const pageUrl = toTargetUrl(request.url);
  const viewportHeight = heightFor(request.width);

  const capture = await capturePage({
    allowLoopback: pageUrl.allowLoopback,
    deadline: Date.now() + PAGE_IMPORT_DEADLINE_MS,
    height: viewportHeight,
    selector: request.selector,
    url: pageUrl.url,
    width: request.width,
  });

  const written = await writePage(
    target,
    request,
    capture,
    pageUrl.allowLoopback
  );

  const placement = await placeFrame(
    target.canvas,
    target,
    {
      height: viewportHeight,
      label: written.title.slice(0, LABEL_MAX),
      page: written.page,
      width: request.width,
    },
    sourceOf(commit)
  );

  const version = await saveImport(target, written, placement, commit);

  return { result: resultOf(capture, written, placement, version), version };
};

export { importPageCopy };

export type { ImportCommit, ImportOutcome, ImportTarget };
