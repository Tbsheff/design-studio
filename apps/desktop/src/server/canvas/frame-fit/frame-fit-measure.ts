import type { Direction, Project } from "@design-studio/contracts";
import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import { withFrameStateHost } from "@design-studio/contracts/frame-state";
import type { FrameStatesView } from "@design-studio/contracts/frame-state";

import type {
  PreviewService,
  RenderPage,
} from "../../../shared/server-ports.js";
import { frameStatesView } from "../../app/frame-state.js";
import { BadRequestError } from "../../platform/errors/index.js";
import { waitForPage } from "../../preview/page-capture/index.js";
import { withPagePath } from "../../project-source/index.js";
import type { LinkRuntime } from "../links/link-runtime.js";
import { CANVAS_VIEWPORTS } from "../tools.js";
import {
  toBaseHeight,
  toCheckedFit,
  toFirstStep,
} from "./engine/to-fit-height.js";
import type { FitResult } from "./engine/to-fit-height.js";

type FitPreview = Pick<PreviewService, "directionUrl" | "withPage">;

interface FitTarget {
  readonly direction: Direction;
  readonly frame: CanvasFileFrame;
  readonly project: Project;
}

const SCROLL_HEIGHT = "document.documentElement.scrollHeight";

const NO_RENDER_TEXT =
  "This studio cannot render pages, so it cannot measure the frames.";

const toScrollHeight = async (page: RenderPage): Promise<number> => {
  await waitForPage(page);

  return Math.ceil(await page.evaluate<number>(SCROLL_HEIGHT));
};

const toStatesView = async (
  runtime: LinkRuntime,
  projectId: string
): Promise<FrameStatesView | null> => {
  try {
    return await frameStatesView(runtime.frameStates.projectDir(projectId));
  } catch {
    return null;
  }
};

const toFrameUrl = async (
  runtime: LinkRuntime,
  preview: FitPreview,
  target: FitTarget
): Promise<string> => {
  const { direction, frame, project } = target;

  const url = withPagePath(
    await preview.directionUrl(project, direction),
    frame.path
  );

  if (!project.app) {
    return url;
  }

  const view = await toStatesView(runtime, project.id);

  return withFrameStateHost(url, view?.frames[frame.id] ?? null);
};

const toRenderedHeight = (
  preview: FitPreview,
  url: string,
  width: number,
  height: number
): Promise<number> => {
  const withPage = preview.withPage?.bind(preview) ?? null;

  if (withPage === null) {
    throw new BadRequestError(NO_RENDER_TEXT);
  }

  return withPage<number>(url, { height, width }, toScrollHeight);
};

const toFrameFit = async (
  runtime: LinkRuntime,
  target: FitTarget
): Promise<FitResult> => {
  const { preview } = runtime;

  if (preview === null) {
    throw new BadRequestError(NO_RENDER_TEXT);
  }

  const url = await toFrameUrl(runtime, preview, target);
  const { width } = target.frame;

  const base = toBaseHeight(
    width,
    Object.values(CANVAS_VIEWPORTS),
    CANVAS_VIEWPORTS.desktop
  );

  const measured = await toRenderedHeight(preview, url, width, base);

  const first = toFirstStep(base, measured);

  if (first.kind === "done") {
    return { height: first.height, warning: null };
  }

  const checked = await toRenderedHeight(preview, url, width, first.height);

  return toCheckedFit(first.height, checked);
};

export { toFrameFit };

export type { FitTarget };
