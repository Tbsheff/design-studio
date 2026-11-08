import type {
  FlowBrokenLink,
  FlowVideoStep,
} from "@design-studio/actions/canvas/schema";
import type { Frame, Page } from "playwright-core";

import {
  hideDevChrome,
  waitForPage,
} from "../../preview/page-capture/index.js";
import { CaptureUnavailableError } from "../../state-styles/index.js";
import { toCandidateLinks, toStepAtMs } from "./engine/index.js";
import type { FlowLink } from "./engine/index.js";
import {
  setCursor,
  startOverlay,
  startRipple,
  stopOverlay,
} from "./flow-cursor.js";
import { toFrameUrl } from "./flow-load.js";
import type { FlowRequest, FlowTarget } from "./flow-load.js";

interface WalkRun {
  readonly explicit: readonly FlowLink[] | null;
  readonly page: Page;
  readonly request: FlowRequest;
  readonly target: FlowTarget;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface WalkState {
  readonly broken: readonly FlowBrokenLink[];
  readonly context: Frame;
  readonly cursor: Point;
  readonly frameId: string;
  readonly steps: readonly FlowVideoStep[];
  readonly visited: ReadonlySet<string>;
}

interface Picked {
  readonly broken: readonly FlowBrokenLink[];
  readonly center: Point;
  readonly link: FlowLink | null;
}

const HALF = 2;

const CLICK_SETTLE_MS = 250;

const LOCATE_MS = 2000;

const OVERLAY_FRAME = "#__flow_overlay iframe";

const NO_SELECTOR = "The linked element is not on the page.";

const NO_TARGET = "The target frame is gone.";

const NO_OVERLAY = "The overlay frame did not open.";

const toHalfMs = (run: WalkRun): number =>
  Math.round(run.request.stepMs / HALF);

const getCenter = async (
  context: Frame,
  selector: string
): Promise<Point | null> => {
  try {
    const locator = context.locator(selector).first();

    if ((await locator.count()) === 0) {
      return null;
    }

    await locator.scrollIntoViewIfNeeded({ timeout: LOCATE_MS });

    const box = await locator.boundingBox({ timeout: LOCATE_MS });

    if (box === null) {
      return null;
    }

    return { x: box.x + box.width / HALF, y: box.y + box.height / HALF };
  } catch {
    return null;
  }
};

const toBroken = (link: FlowLink, reason: string): FlowBrokenLink => ({
  linkId: link.id,
  reason,
});

const getLinkFrom = async (
  run: WalkRun,
  state: WalkState,
  candidates: readonly FlowLink[],
  broken: readonly FlowBrokenLink[]
): Promise<Picked> => {
  const link = candidates.at(0) ?? null;
  const rest = candidates.slice(1);

  if (link === null) {
    return { broken, center: state.cursor, link: null };
  }

  if (!run.target.frames.some((frame) => frame.id === link.toFrame)) {
    return getLinkFrom(run, state, rest, [
      ...broken,
      toBroken(link, NO_TARGET),
    ]);
  }

  const center = await getCenter(state.context, link.selector);

  if (center === null) {
    return getLinkFrom(run, state, rest, [
      ...broken,
      toBroken(link, NO_SELECTOR),
    ]);
  }

  return { broken, center, link };
};

const getLink = (run: WalkRun, state: WalkState): Promise<Picked> => {
  if (run.explicit !== null) {
    const link = run.explicit[state.steps.length - 1] ?? null;

    if (link === null) {
      return Promise.resolve({ broken: [], center: state.cursor, link: null });
    }

    return getLinkFrom(run, state, [link], []);
  }

  const candidates = toCandidateLinks(
    run.target.links,
    state.frameId,
    state.visited
  );

  return getLinkFrom(run, state, candidates, []);
};

const isSamePage = (current: string, expected: string): boolean => {
  try {
    const left = new URL(current);
    const right = new URL(expected);

    return left.origin === right.origin && left.pathname === right.pathname;
  } catch {
    return false;
  }
};

const runPrepare = async (
  page: Page,
  context: Frame | Page,
  at: Point
): Promise<void> => {
  await waitForPage(context);
  await hideDevChrome(context);
  await setCursor(page, { isFirst: true, ...at });
};

const toOverlayKind = (link: FlowLink): "drawer" | "modal" => {
  if (link.action === "drawer") {
    return "drawer";
  }

  return "modal";
};

const runOverlay = async (
  run: WalkRun,
  link: FlowLink,
  url: string,
  at: Point
): Promise<Frame> => {
  await startOverlay(run.page, url, toOverlayKind(link));

  const handle = await run.page.waitForSelector(OVERLAY_FRAME);
  const frame = await handle.contentFrame();

  if (frame === null) {
    throw new CaptureUnavailableError(NO_OVERLAY);
  }

  await frame.waitForLoadState("load");
  await waitForPage(frame);
  await hideDevChrome(frame);
  await setCursor(run.page, { isFirst: false, ...at });

  return frame;
};

const runMouseClick = async (page: Page, at: Point): Promise<boolean> => {
  try {
    await page.mouse.click(at.x, at.y);

    return true;
  } catch {
    return false;
  }
};

const runLoadWait = async (page: Page): Promise<boolean> => {
  try {
    await page.waitForLoadState("load");

    return true;
  } catch {
    return false;
  }
};

const runNavigate = async (
  run: WalkRun,
  state: WalkState,
  url: string,
  at: Point
): Promise<Frame> => {
  const { page } = run;

  if (state.context !== page.mainFrame()) {
    await stopOverlay(page);
  }

  await runMouseClick(page, at);
  await page.waitForTimeout(CLICK_SETTLE_MS);
  await runLoadWait(page);

  if (!isSamePage(page.url(), url)) {
    await page.goto(url, { waitUntil: "load" });
  }

  await runPrepare(page, page, at);

  return page.mainFrame();
};

interface OpenTarget {
  readonly center: Point;
  readonly link: FlowLink;
  readonly url: string;
}

const runOpen = (
  run: WalkRun,
  state: WalkState,
  open: OpenTarget
): Promise<Frame> => {
  if (open.link.action === "navigate") {
    return runNavigate(run, state, open.url, open.center);
  }

  return runOverlay(run, open.link, open.url, open.center);
};

const runClick = async (
  run: WalkRun,
  state: WalkState,
  picked: Picked & { readonly link: FlowLink }
): Promise<WalkState> => {
  const { center, link } = picked;
  const { page } = run;
  const half = toHalfMs(run);

  const frame =
    run.target.frames.find((item) => item.id === link.toFrame) ?? null;

  if (frame === null) {
    throw new CaptureUnavailableError(NO_TARGET);
  }

  const url = toFrameUrl(run.target.baseUrl, frame);

  await setCursor(page, { isFirst: false, ...center });
  await page.waitForTimeout(half);
  await startRipple(page, center.x, center.y);

  const opened = await runOpen(run, state, { center, link, url });

  await page.waitForTimeout(half);

  const position = state.steps.length;

  return {
    broken: state.broken,
    context: opened,
    cursor: center,
    frameId: link.toFrame,
    steps: [
      ...state.steps,
      {
        atMs: toStepAtMs(position, run.request.stepMs),
        frameId: link.toFrame,
        index: position,
        linkId: link.id,
        selector: link.selector,
      },
    ],
    visited: new Set([...state.visited, link.toFrame]),
  };
};

const runWalk = async (run: WalkRun, state: WalkState): Promise<WalkState> => {
  if (state.steps.length > run.request.maxSteps) {
    return state;
  }

  const picked = await getLink(run, state);
  const counted = { ...state, broken: [...state.broken, ...picked.broken] };

  if (picked.link === null) {
    return counted;
  }

  const next = await runClick(run, counted, { ...picked, link: picked.link });

  return runWalk(run, next);
};

export { runPrepare, runWalk };

export type { Point, WalkRun, WalkState };
