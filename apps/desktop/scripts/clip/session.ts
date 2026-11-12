import path from "node:path";

import type { Page } from "playwright-core";

import { toPageExpression } from "./probe-page.ts";
import type { MarkOptions } from "./probe-page.ts";
import type { Limits } from "./probe.ts";
import { runEach, toFirstLine } from "./steps.ts";
import type { BoxRect, ClipRun, Finding, PageFinding } from "./types.ts";

interface MarkedTarget {
  readonly index: number;
  readonly key: string;
}

const LIMITS: Limits = {
  depth: 4,
  ignore: ".stage",
  label: 40,
  overlap: 2,
  scope: null,
  slack: 1,
  snippet: 60,
  textSlack: 2,
  tiny: 4,
};

const TIP_LIMITS: Limits = {
  ...LIMITS,
  scope: '[role="tooltip"], :popover-open, .tooltip',
};

const TIP_MARKS: MarkOptions = {
  attribute: "data-clip-tip",
  limits: LIMITS,
  selector: '[data-tip]:not([data-tip=""])',
};

const MENU_MARKS: MarkOptions = {
  attribute: "data-clip-menu",
  limits: LIMITS,
  selector: '[aria-haspopup]:not([aria-haspopup="false"]):not([disabled])',
};

const CROP_PAD = 24;
const CROP_DIGITS = 4;
const SETTLE_MS = 250;
const TIP_MS = 650;
const MENU_MS = 400;
const ACTION_TIMEOUT_MS = 2500;

const CLEAR_TARGET =
  "document.querySelectorAll('[data-clip-target]').forEach((node) => node.removeAttribute('data-clip-target'))";

const toCropRect = (rect: BoxRect, page: Page): BoxRect | null => {
  const viewport = page.viewportSize();

  if (viewport === null) {
    return null;
  }

  const left = Math.max(0, Math.floor(rect.x - CROP_PAD));
  const top = Math.max(0, Math.floor(rect.y - CROP_PAD));

  const right = Math.min(
    viewport.width,
    Math.ceil(rect.x + rect.width + CROP_PAD)
  );

  const bottom = Math.min(
    viewport.height,
    Math.ceil(rect.y + rect.height + CROP_PAD)
  );

  if (right - left < 1 || bottom - top < 1) {
    return null;
  }

  return { height: bottom - top, width: right - left, x: left, y: top };
};

const createCrop = async (
  run: ClipRun,
  found: PageFinding,
  index: number
): Promise<string | null> => {
  if (found.rect === null) {
    return null;
  }

  const clip = toCropRect(found.rect, run.page);

  if (clip === null) {
    return null;
  }

  const file = `${String(index).padStart(CROP_DIGITS, "0")}-${found.kind}.png`;

  try {
    await run.page.screenshot({ clip, path: path.join(run.cropDir, file) });

    return file;
  } catch {
    return null;
  }
};

const insertFinding = async (
  run: ClipRun,
  state: string,
  item: PageFinding
): Promise<void> => {
  const key = `${item.kind}|${run.mode}|${item.selector}`;
  const existing = run.findings.get(key) ?? null;

  if (existing !== null) {
    if (!existing.states.includes(state)) {
      existing.states.push(state);
    }

    return;
  }

  const crop = await createCrop(run, item, run.findings.size + 1);

  const finding: Finding = {
    ...item,
    crop,
    key,
    mode: run.mode,
    state,
    states: [state],
  };

  run.findings.set(key, finding);
};

const insertFindings = async (
  run: ClipRun,
  state: string,
  found: readonly PageFinding[]
): Promise<void> => {
  await runEach(found, async (item) => {
    await insertFinding(run, state, item);
  });
};

const inspectState = async (run: ClipRun, state: string): Promise<void> => {
  await run.page.waitForTimeout(SETTLE_MS);

  const found: PageFinding[] = await run.page.evaluate(
    toPageExpression("inspectPage", LIMITS)
  );

  await insertFindings(run, state, found);
};

const toFreshTargets = (
  keys: readonly string[],
  seen: Set<string>
): MarkedTarget[] =>
  keys.flatMap((key, index) => {
    if (seen.has(key)) {
      return [];
    }

    seen.add(key);

    return [{ index, key }];
  });

const inspectTip = async (
  run: ClipRun,
  state: string,
  tip: MarkedTarget
): Promise<void> => {
  const target = run.page.locator(`[data-clip-tip="${tip.index}"]`);

  try {
    await target.hover({ timeout: ACTION_TIMEOUT_MS });
    await target.evaluate((node) => {
      if (node instanceof HTMLElement) {
        node.dataset.clipTarget = "";
      }
    });
    await run.page.waitForTimeout(TIP_MS);

    const found: PageFinding[] = await run.page.evaluate(
      toPageExpression("inspectTip", TIP_LIMITS)
    );

    await insertFindings(run, `${state} > tip`, found);
  } catch (error) {
    console.log(
      `tip skipped in ${state}: ${tip.key}: ${toFirstLine(String(error))}`
    );
  } finally {
    await run.page.evaluate(CLEAR_TARGET);
  }
};

const inspectTips = async (run: ClipRun, state: string): Promise<void> => {
  const keys: string[] = await run.page.evaluate(
    toPageExpression("setTargets", TIP_MARKS)
  );

  await runEach(toFreshTargets(keys, run.tips), async (tip) => {
    await inspectTip(run, state, tip);
  });
  await run.page.mouse.move(1, 1);
};

const stopOverlays = async (page: Page): Promise<void> => {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(SETTLE_MS);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(SETTLE_MS);
};

const inspectMenu = async (
  run: ClipRun,
  state: string,
  menu: MarkedTarget
): Promise<void> => {
  const trigger = run.page.locator(`[data-clip-menu="${menu.index}"]`);

  try {
    await trigger.click({ timeout: ACTION_TIMEOUT_MS });
    await run.page.waitForTimeout(MENU_MS);
    await inspectState(run, `${state} > menu ${menu.key}`);
  } catch (error) {
    console.log(
      `menu skipped in ${state}: ${menu.key}: ${toFirstLine(String(error))}`
    );
  } finally {
    await stopOverlays(run.page);
  }
};

const inspectMenus = async (run: ClipRun, state: string): Promise<void> => {
  const keys: string[] = await run.page.evaluate(
    toPageExpression("setTargets", MENU_MARKS)
  );

  await runEach(toFreshTargets(keys, run.menus), async (menu) => {
    await inspectMenu(run, state, menu);
  });
};

const insertUnreachable = async (
  run: ClipRun,
  state: string
): Promise<void> => {
  await insertFinding(run, state, {
    amount: 0,
    detail: `the check could not open "${state}" at ${run.mode}`,
    kind: "unreachable",
    rect: null,
    selector: state,
    text: "",
  });
};

export {
  insertUnreachable,
  inspectMenus,
  inspectState,
  inspectTips,
  stopOverlays,
};
