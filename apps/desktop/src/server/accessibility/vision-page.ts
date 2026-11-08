import type { RenderClip } from "../../shared/render-rpc.js";
import type { PreviewService, RenderPage } from "../preview/index.js";
import {
  hideDevChrome,
  selectorClipExpression,
  waitForPage,
} from "../preview/page-capture/index.js";
import { ACCESSIBILITY_LIST_MAX } from "./deps.js";
import type { VisionKind } from "./engine/vision-matrix.js";
import { AccessibilityError } from "./errors.js";
import { accessibilityProbe } from "./probe.js";
import type { RawProbe } from "./probe.js";
import { toResetScript, toVisionScript } from "./vision-filter.js";
import { toColorProbe } from "./vision-probe.js";
import type { RawColors } from "./vision-probe.js";
import type { VisionTarget } from "./vision-target.js";

interface VisionFile {
  readonly file: string;
  readonly kind: VisionKind;
}

interface VisionPlan {
  readonly files: readonly VisionFile[];
  readonly original: string;
}

interface VisionCapture {
  readonly colors: RawColors;
  readonly raw: RawProbe;
}

const COLOR_MAX = 600;

const NO_PADDING = 0;

const runScreenshot = async (
  page: RenderPage,
  file: string,
  clip: RenderClip | null
): Promise<void> => {
  if (clip === null) {
    await page.screenshot(file);

    return;
  }

  await page.screenshot(file, clip);
};

const runShot = async (
  page: RenderPage,
  item: VisionFile,
  clip: RenderClip | null
): Promise<void> => {
  await page.evaluate(toVisionScript(item.kind));
  await runScreenshot(page, item.file, clip);
};

const runShots = async (
  page: RenderPage,
  files: readonly VisionFile[],
  clip: RenderClip | null
): Promise<void> => {
  const item = files[0] ?? null;

  if (item === null) {
    return;
  }

  await runShot(page, item, clip);
  await runShots(page, files.slice(1), clip);
};

const getClip = (
  page: RenderPage,
  target: VisionTarget
): Promise<RenderClip | null> => {
  if (target.selector === null) {
    return Promise.resolve(null);
  }

  return page.evaluate<RenderClip | null>(
    selectorClipExpression(target.selector, NO_PADDING)
  );
};

const runCapture = async (
  page: RenderPage,
  target: VisionTarget,
  plan: VisionPlan
): Promise<VisionCapture> => {
  await waitForPage(page);
  await hideDevChrome(page);

  const raw = await page.evaluate<RawProbe>(
    accessibilityProbe({ max: ACCESSIBILITY_LIST_MAX, root: target.selector })
  );

  if (raw.missingRoot) {
    throw new AccessibilityError(
      `No element matches ${target.selector ?? "the layer"} on the page.`
    );
  }

  const [colors, clip] = await Promise.all([
    page.evaluate<RawColors>(
      toColorProbe({ max: COLOR_MAX, root: target.selector })
    ),
    getClip(page, target),
  ]);

  await runScreenshot(page, plan.original, clip);

  try {
    await runShots(page, plan.files, clip);
  } finally {
    await page.evaluate(toResetScript());
  }

  return { colors, raw };
};

const runVisionCapture = (
  preview: Pick<PreviewService, "withPage">,
  target: VisionTarget,
  plan: VisionPlan
): Promise<VisionCapture> => {
  if (!preview.withPage) {
    throw new AccessibilityError("Rendering is not available.");
  }

  return preview.withPage(
    target.url,
    {
      height: target.frame.viewport.height,
      width: target.frame.viewport.width,
    },
    (page) => runCapture(page, target, plan)
  );
};

export { runVisionCapture };

export type { VisionCapture, VisionFile, VisionPlan };
