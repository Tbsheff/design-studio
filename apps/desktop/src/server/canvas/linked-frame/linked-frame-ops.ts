import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";
import { CANVAS_FILE } from "@design-studio/contracts/canvas-file";
import type {
  CanvasFile,
  CanvasFileFrame,
} from "@design-studio/contracts/canvas-file";
import {
  cleanLinkSelector,
  cleanLinkText,
  LINKS_FILE,
  upsertLink,
} from "@design-studio/contracts/links";
import type { PrototypeLink } from "@design-studio/contracts/links";

import { publishVersion, writeNewFile } from "../../direct-edit/index.js";
import type { DirectEditRuntime } from "../../direct-edit/index.js";
import { isOwnAgentRun } from "../../platform/call-origin/index.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../platform/errors/index.js";
import { framesOf, probeWithPreview } from "../links/link-tools.js";
import type { LinkProbe, ProbedElement } from "../links/link-tools.js";
import { canvasOwner } from "../service.js";
import { applyPlacement, CANVAS_VIEWPORTS, findFrame } from "../tools.js";
import type { CanvasToolContext } from "../tools.js";
import {
  isSafePagePath,
  toFreePagePath,
  toLinkedPage,
  toPagePath,
  toPageSlug,
} from "./engine/to-linked-page.js";

interface LinkedFrameQuery {
  readonly fromFrame: string;
  readonly label: string | null;
  readonly path: string | null;
  readonly selector: string;
}

interface LinkedFrameTarget {
  readonly direction: Direction;
  readonly project: Project;
  readonly runtime: DirectEditRuntime;
}

interface LinkedFrameWritten {
  readonly directionId: string;
  readonly frameId: string;
  readonly label: string;
  readonly linkId: string;
  readonly path: string;
  readonly sourcePath: string;
}

interface LinkedSource {
  readonly frame: CanvasFileFrame;
  readonly html: string;
  readonly label: string;
  readonly selector: string;
  readonly sourcePath: string;
  readonly tag: string | null;
}

interface TextChange {
  readonly after: string;
  readonly before: string;
  readonly created: boolean;
  readonly file: string;
  readonly relative: string;
}

type LayoutTexts = readonly [string | null, string | null];

interface WrittenScreen {
  readonly before: LayoutTexts;
  readonly frame: CanvasFileFrame;
  readonly link: PrototypeLink;
  readonly page: string;
  readonly pagePath: string;
}

const CLIENT = "ui";

const DEFAULT_LABEL = "New screen";

const FRAME_GAP = 160;

const APP_TEXT =
  "This project is an app. Use create_screen to add a screen to the app.";

const RUN_BUSY =
  "An agent run is editing this direction. Wait for it to end, then add the screen.";

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

const isPresent = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const toCheckTarget = (target: LinkedFrameTarget): void => {
  const { direction, project, runtime } = target;

  if (project.app || project.kind !== "html") {
    throw new BadRequestError(APP_TEXT);
  }

  if (canvasOwner(project).id !== direction.id) {
    throw new BadRequestError(
      "Add linked screens in the direction that owns the canvas. Pass directionId null."
    );
  }

  if (
    runtime.editDeps.runner.isRunning(project.id, direction.id) &&
    !isOwnAgentRun(project.id, direction.id)
  ) {
    throw new ConflictError(RUN_BUSY);
  }
};

const toContext = (target: LinkedFrameTarget): CanvasToolContext => ({
  canvas: target.runtime.canvas,
  direction: target.direction,
  mode: "edit",
  plan: false,
  project: target.project,
});

const toProbed = async (
  probe: LinkProbe,
  frame: CanvasFileFrame,
  selector: string
): Promise<ProbedElement | null> => {
  try {
    const [found] = await probe(frame, [{ id: "new", selector }]);

    return found ?? null;
  } catch (error) {
    throw new BadRequestError(
      `Could not render ${toEntryPage(frame)} to check the selector: ${String(error)}`
    );
  }
};

const toProbedLabel = async (
  target: LinkedFrameTarget,
  frame: CanvasFileFrame,
  selector: string
): Promise<{ readonly tag: string | null; readonly text: string }> => {
  const probe = probeWithPreview(
    target.runtime.preview,
    target.project,
    target.direction,
    null
  );

  if (!probe) {
    return { tag: null, text: "" };
  }

  const found = await toProbed(probe, frame, selector);

  if (!found) {
    throw new NotFoundError(
      `No element matches ${selector} on ${toEntryPage(frame)} of ${frame.id}. Check the selector with get_frame_html.`
    );
  }

  return { tag: found.tag, text: cleanLinkText(found.text) ?? "" };
};

const toSource = async (
  target: LinkedFrameTarget,
  query: LinkedFrameQuery
): Promise<LinkedSource> => {
  const frames = await framesOf(toContext(target));
  const frame = findFrame(frames, query.fromFrame);

  if (!frame) {
    throw new NotFoundError(
      `No frame ${query.fromFrame}. Call canvas_list for the ids and labels.`
    );
  }

  const selector = cleanLinkSelector(query.selector);

  if (!selector) {
    throw new BadRequestError("selector is empty or too long.");
  }

  const sourcePath = toEntryPage(frame);

  const html = await toReadText(
    path.join(target.direction.workTree, sourcePath)
  );

  if (html === null) {
    throw new NotFoundError(`No page ${sourcePath} in this direction.`);
  }

  const probed = await toProbedLabel(target, frame, selector);
  const label = query.label?.trim() || probed.text || DEFAULT_LABEL;

  return { frame, html, label, selector, sourcePath, tag: probed.tag };
};

const toTakenNames = async (workTree: string): Promise<Set<string>> => {
  try {
    return new Set(await readdir(workTree));
  } catch {
    return new Set();
  }
};

const toNewPagePath = async (
  target: LinkedFrameTarget,
  query: LinkedFrameQuery,
  label: string
): Promise<string> => {
  const { workTree } = target.direction;

  if (query.path !== null && query.path.trim() !== "") {
    const wanted = toPagePath(query.path);

    if (!isSafePagePath(wanted)) {
      throw new BadRequestError(
        `${query.path} is not a page path. Pass a path like booking.html.`
      );
    }

    if (await isPresent(path.join(workTree, wanted))) {
      throw new ConflictError(
        `${wanted} exists. Pass another path, or null to make one from the label.`
      );
    }

    return wanted;
  }

  const free = toFreePagePath(toPageSlug(label), await toTakenNames(workTree));

  if (free === null) {
    throw new ConflictError("No free page name. Pass a path.");
  }

  return free;
};

const toCanvasText = (direction: Direction): Promise<string | null> =>
  toReadText(path.join(direction.workTree, ...CANVAS_FILE.split("/")));

const toLinksText = (direction: Direction): Promise<string | null> =>
  toReadText(path.join(direction.workTree, ...LINKS_FILE.split("/")));

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

const toPlacedFrame = async (
  target: LinkedFrameTarget,
  source: LinkedSource,
  pagePath: string
): Promise<CanvasFileFrame> => {
  let placed: CanvasFileFrame | null = null;

  await target.runtime.canvas.update(
    target.project,
    (file) => {
      const next = applyPlacement(
        toWithEntryFrame(file, target.direction.id),
        [
          {
            gap: FRAME_GAP,
            height: source.frame.height,
            label: source.label,
            path: pagePath,
            rightOf: source.frame.id,
            width: source.frame.width,
          },
        ],
        target.direction.id
      );

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

const toLinkFrom = (source: LinkedSource): PrototypeLink["from"] => {
  const from: PrototypeLink["from"] = {
    frame: source.frame.id,
    path: source.frame.path ?? "",
    selector: source.selector,
    text: source.label,
  };

  if (source.tag !== null) {
    from.tag = source.tag;
  }

  return from;
};

const toSavedLink = async (
  target: LinkedFrameTarget,
  source: LinkedSource,
  frame: CanvasFileFrame
): Promise<PrototypeLink> => {
  let saved: PrototypeLink | null = null;
  const from = toLinkFrom(source);

  await target.runtime.canvas.links.update(
    target.project,
    (current) => {
      const next = upsertLink(current, {
        from,
        to: { frame: frame.id },
        transition: "instant",
      });

      saved = next.link;

      return next.file;
    },
    "run"
  );

  const link: PrototypeLink | null = saved;

  if (link === null) {
    throw new BadRequestError("The link was not saved.");
  }

  return link;
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
  target: LinkedFrameTarget,
  pagePath: string,
  changes: readonly TextChange[]
): Promise<void> => {
  const { direction, project, runtime } = target;
  const deps = runtime.editDeps;
  const stepLabel = `Add screen ${pagePath}`;

  const version = await deps.versions.commitFile(
    project,
    direction,
    [pagePath, CANVAS_FILE, LINKS_FILE],
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

const toLayoutTexts = (direction: Direction): Promise<LayoutTexts> =>
  Promise.all([toCanvasText(direction), toLinksText(direction)]);

const toChanges = async (
  target: LinkedFrameTarget,
  screen: WrittenScreen
): Promise<TextChange[]> => {
  const { direction } = target;
  const [canvasAfter, linksAfter] = await toLayoutTexts(direction);
  const [canvasBefore, linksBefore] = screen.before;

  return [
    toChange(direction, screen.pagePath, null, screen.page),
    toChange(direction, CANVAS_FILE, canvasBefore, canvasAfter),
    toChange(direction, LINKS_FILE, linksBefore, linksAfter),
  ];
};

const toWrittenScreen = async (
  target: LinkedFrameTarget,
  source: LinkedSource,
  pagePath: string
): Promise<WrittenScreen> => {
  const before = await toLayoutTexts(target.direction);
  const page = toLinkedPage(source.html, source.label);

  await writeNewFile(path.join(target.direction.workTree, pagePath), page);

  const frame = await toPlacedFrame(target, source, pagePath);
  const link = await toSavedLink(target, source, frame);

  return { before, frame, link, page, pagePath };
};

const createLinkedFrame = async (
  target: LinkedFrameTarget,
  query: LinkedFrameQuery
): Promise<LinkedFrameWritten> => {
  toCheckTarget(target);

  const source = await toSource(target, query);
  const pagePath = await toNewPagePath(target, query, source.label);
  const screen = await toWrittenScreen(target, source, pagePath);

  await toCommit(target, pagePath, await toChanges(target, screen));

  return {
    directionId: target.direction.id,
    frameId: screen.frame.id,
    label: source.label,
    linkId: screen.link.id,
    path: pagePath,
    sourcePath: source.sourcePath,
  };
};

export { createLinkedFrame };

export type { LinkedFrameQuery, LinkedFrameTarget, LinkedFrameWritten };
