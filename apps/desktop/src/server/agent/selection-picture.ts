import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as toDelay } from "node:timers/promises";

import type {
  Attachment,
  Direction,
  Project,
  RunRequest,
  SelectionContext,
} from "@design-studio/contracts";

import type { RenderClip } from "../../shared/render-rpc.js";
import type { PreviewService, RenderPage } from "../../shared/server-ports.js";
import {
  hideDevChrome,
  selectorClipExpression,
} from "../preview/page-capture/index.js";
import { withPagePath } from "../project-source/index.js";
import { SELECTION_PICTURE_NAME } from "./selected-elements.js";

interface PictureDeps {
  readonly preview: PreviewService;
  readonly projects: {
    readonly saveAttachment: (
      projectId: string,
      file: { name: string; mime: string; bytes: Uint8Array }
    ) => Promise<Attachment>;
  };
}

interface PictureTarget {
  readonly direction: Direction;
  readonly project: Project;
}

interface PictureFrame {
  readonly height: number;
  readonly path: string;
  readonly width: number;
}

const PICTURE_MIN = 1;
const PICTURE_MAX = 5;
const PICTURE_PAD = 24;
const PICTURE_SCALE = 2;
const PICTURE_MAX_WIDTH = 1600;
const PICTURE_WAIT_MS = 1500;
const FALLBACK_FRAME: PictureFrame = { height: 800, path: "", width: 1280 };

const toFrame = (request: RunRequest): PictureFrame => {
  if (request.canvas) {
    return {
      height: request.canvas.height,
      path: request.canvas.path,
      width: request.canvas.width,
    };
  }

  return FALLBACK_FRAME;
};

const toJointWidth = (selection: readonly SelectionContext[]): number => {
  const left = Math.min(...selection.map((item) => item.rect.x));

  const right = Math.max(
    ...selection.map((item) => item.rect.x + item.rect.width)
  );

  return Math.max(1, right - left + PICTURE_PAD * 2);
};

const toScale = (selection: readonly SelectionContext[]): number =>
  Math.min(PICTURE_SCALE, PICTURE_MAX_WIDTH / toJointWidth(selection));

const toJointClip = (
  clips: readonly (RenderClip | null)[]
): RenderClip | null => {
  const found = clips.filter((clip): clip is RenderClip => clip !== null);

  if (found.length === 0) {
    return null;
  }

  const left = Math.min(...found.map((clip) => clip.x));
  const top = Math.min(...found.map((clip) => clip.y));
  const right = Math.max(...found.map((clip) => clip.x + clip.width));
  const bottom = Math.max(...found.map((clip) => clip.y + clip.height));

  return {
    height: Math.max(1, Math.round(bottom - top)),
    width: Math.max(1, Math.round(right - left)),
    x: Math.round(left),
    y: Math.round(top),
  };
};

const toPageClip = async (
  page: RenderPage,
  selection: readonly SelectionContext[]
): Promise<RenderClip | null> => {
  const clips = await Promise.all(
    selection.map((item) =>
      page.evaluate<RenderClip | null>(
        selectorClipExpression(item.selector, PICTURE_PAD)
      )
    )
  );

  return toJointClip(clips);
};

const toPageShot = async (
  page: RenderPage,
  selection: readonly SelectionContext[]
): Promise<Buffer | null> => {
  await hideDevChrome(page);
  const clip = await toPageClip(page, selection);

  if (clip === null) {
    return null;
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), "studio-picture-"));
  const out = path.join(dir, SELECTION_PICTURE_NAME);

  try {
    await page.screenshot(out, clip);

    return await readFile(out);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
};

const toPicturePng = async (
  preview: PreviewService,
  target: PictureTarget,
  request: RunRequest,
  selection: readonly SelectionContext[]
): Promise<Buffer | null> => {
  if (!preview.withPage) {
    return null;
  }

  const frame = toFrame(request);
  const url = await preview.directionUrl(target.project, target.direction);

  return preview.withPage(
    withPagePath(url, frame.path),
    { height: frame.height, scale: toScale(selection), width: frame.width },
    (page) => toPageShot(page, selection)
  );
};

const toSafePng = async (
  preview: PreviewService,
  target: PictureTarget,
  request: RunRequest,
  selection: readonly SelectionContext[]
): Promise<Buffer | null> => {
  try {
    return await toPicturePng(preview, target, request, selection);
  } catch {
    return null;
  }
};

const toTimedPng = (
  preview: PreviewService,
  target: PictureTarget,
  request: RunRequest,
  selection: readonly SelectionContext[]
): Promise<Buffer | null> =>
  Promise.race([
    toSafePng(preview, target, request, selection),
    toDelay(PICTURE_WAIT_MS, null, { ref: false }),
  ]);

const isPictureWanted = (
  selection: readonly SelectionContext[],
  isOn: boolean
): boolean =>
  isOn && selection.length >= PICTURE_MIN && selection.length <= PICTURE_MAX;

const applySelectionPicture = async (
  deps: PictureDeps,
  target: PictureTarget,
  request: RunRequest,
  isOn: boolean
): Promise<RunRequest> => {
  const selection = request.selection ?? [];

  if (!isPictureWanted(selection, isOn)) {
    return request;
  }

  const png = await toTimedPng(deps.preview, target, request, selection);

  if (png === null) {
    return request;
  }

  const attachment = await deps.projects.saveAttachment(target.project.id, {
    bytes: png,
    mime: "image/png",
    name: SELECTION_PICTURE_NAME,
  });

  return {
    ...request,
    attachmentIds: [...(request.attachmentIds ?? []), attachment.id],
    selectionPicture: attachment.id,
  };
};

export { applySelectionPicture };
