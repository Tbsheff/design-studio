import type { ExportFrame } from "@design-studio/contracts/export";
import { withFrameStateHost } from "@design-studio/contracts/frame-state";
import { withForcedParam } from "@design-studio/contracts/state-styles";

import type { PreviewService } from "../../shared/server-ports.js";
import {
  isLayerRef,
  LayerRefError,
  resolveLayerRef,
  scopeOf,
} from "../page-probe/index.js";
import { BadRequestError } from "../platform/errors/index.js";
import { withPagePath } from "../project-source/index.js";
import type { ExportSource } from "../project-source/index.js";
import { attemptNull, toOptional } from "./attempt-null.js";
import { captureFrame } from "./capture.js";
import type { Shot } from "./capture.js";
import { pickFrame } from "./frame-shot-pick.js";
import type { FramePick } from "./frame-shot-pick.js";
import {
  NO_RENDER,
  resolveFrameSource,
  toPagePath,
  versionLabel,
} from "./frame-source.js";
import type { FrameDeps, ScreenshotView, ShotQuery } from "./frame-source.js";
import { warmAppPage } from "./warm-upstream.js";

const MAX_SHOT_HEIGHT = 6000;

const DEFAULT_WIDTH = 1440;

const DEFAULT_HEIGHT = 900;

const DEFAULT_PADDING = 16;

interface ShotContext {
  readonly frame: ExportFrame;
  readonly page: string | null;
  readonly pick: FramePick;
  readonly preview: PreviewService;
  readonly query: ShotQuery;
  readonly src: ExportSource;
}

const toFrame = (
  query: ShotQuery,
  pick: FramePick,
  page: string | null
): ExportFrame => {
  const frame: ExportFrame = {
    height: query.height ?? pick.height ?? DEFAULT_HEIGHT,
    name: "Screenshot",
    width: query.width ?? pick.width ?? DEFAULT_WIDTH,
  };

  if (page) {
    return { ...frame, path: page };
  }

  return frame;
};

const toSelector = async (
  context: ShotContext,
  url: string,
  element: string
): Promise<string> => {
  if (!isLayerRef(element)) {
    return element;
  }

  const { frame, preview, src } = context;

  try {
    return await resolveLayerRef(
      preview,
      url,
      { height: frame.height, width: frame.width },
      scopeOf(src.project.id, src.direction.id),
      element.trim()
    );
  } catch (error) {
    if (error instanceof LayerRefError) {
      throw new BadRequestError(error.message);
    }

    throw error;
  }
};

const toSizedNote = (context: ShotContext): string => {
  const { frame, pick, query } = context;

  const isResized =
    pick.width !== null &&
    (frame.width !== pick.width || frame.height !== pick.height);

  if (!isResized) {
    return "";
  }

  return ` Frame ${query.frameId} (page, direction and state) at ${frame.width} × ${frame.height} instead of its ${pick.width} × ${pick.height}.`;
};

const toWhat = (context: ShotContext, shot: Shot): string => {
  const { element } = context.query;

  if (element) {
    return `element ${element} (${shot.cssWidth} × ${shot.cssHeight} CSS px with padding) on a ${context.frame.width} px wide page`;
  }

  return `${shot.width} × ${shot.height} px`;
};

const describe = (context: ShotContext, shot: Shot): string => {
  let note = "";

  if (shot.cropped) {
    note = ` The page is taller; the shot stops at ${MAX_SHOT_HEIGHT} px.`;
  }

  return `${toWhat(context, shot)} of ${versionLabel(context.src)}.${toSizedNote(context)}${note}`;
};

const shoot = async (context: ShotContext, url: string): Promise<Shot> => {
  const { frame, page, preview, query } = context;
  const selectors: string[] = [];

  if (query.element) {
    const pageUrl = withPagePath(url, toOptional(page));
    const selector = await toSelector(context, pageUrl, query.element);

    selectors.push(selector);
  }

  let scope: "frame" | "page" = "frame";

  if (query.isFullPage) {
    scope = "page";
  }

  return captureFrame(
    preview,
    url,
    frame,
    1,
    scope,
    selectors.at(0),
    MAX_SHOT_HEIGHT,
    query.padding ?? DEFAULT_PADDING
  );
};

const openAndShoot = async (context: ShotContext): Promise<ScreenshotView> => {
  const { pick, src } = context;
  const opened = await src.open();

  try {
    const url = withForcedParam(
      withFrameStateHost(opened.url, toOptional(pick.state)),
      pick.forced
    );

    const shot = await shoot(context, url);

    return {
      data: shot.png.toString("base64"),
      mimeType: "image/png",
      text: describe(context, shot),
    };
  } finally {
    await attemptNull(() => opened.release());
  }
};

const readScreenshot = async (
  deps: FrameDeps,
  query: ShotQuery
): Promise<ScreenshotView> => {
  const { preview } = deps;

  if (!preview) {
    throw new BadRequestError(NO_RENDER);
  }

  const pick = await pickFrame(deps.projects, query);

  const src = await resolveFrameSource(
    deps,
    {
      directionId: pick.directionId,
      projectId: query.projectId,
      versionId: pick.versionId,
    },
    true
  );

  const page = toPagePath(query.path) ?? pick.path;

  await warmAppPage(preview, src.project, page);

  return openAndShoot({
    frame: toFrame(query, pick, page),
    page,
    pick,
    preview,
    query,
    src,
  });
};

export { readScreenshot };
