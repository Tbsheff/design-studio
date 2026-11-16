import type { Locator, Page } from "playwright-core";

import { stopOverlays } from "./session.ts";
import type { ClipState } from "./types.ts";

interface ViewSize {
  readonly height: number;
  readonly width: number;
}

interface StageArea {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

interface PanTarget {
  readonly box: Locator;
  readonly toGoal: (area: StageArea) => ViewSize;
}

const WAIT_MS = 3000;
const HOVER_MS = 350;
const EDGE_PX = 40;
const WHEEL_SPAN = 4;
const PAN_STEPS = 6;
const CHIP_ROW = 0.4;
const LOW_ROW = 0.8;
const PANEL_ROW = 0.5;
const NEAR_PX = 2;
const NARROW: ViewSize = { height: 700, width: 900 };
const MORE_CHIP = "button.frame-chip.more";
const FRAME_MENU = ".frame-menu[role='menu']";
const INSPECTOR = "aside.studio-inspector:not([hidden])";
const ARRANGE = "Arrange";
const SUBMENUS = [ARRANGE, "States", "Copy"];
const SIZES = new WeakMap<Page, ViewSize>();

const STAGE_AREA = `(() => {
  const stage = document.querySelector(".stage");
  const panel = document.querySelector('.studio[data-inspector="open"] .studio-inspector');
  const box = stage ? stage.getBoundingClientRect() : { bottom: innerHeight, left: 0, right: innerWidth };
  let right = Math.min(innerWidth, box.right);
  if (panel) { right = Math.min(right, panel.getBoundingClientRect().left); }
  return { bottom: Math.min(innerHeight, box.bottom), left: Math.max(0, box.left), right };
})()`;

const RIGHTMOST_CHIP = `(() => {
  let best = null;
  let right = -Infinity;
  for (const chip of document.querySelectorAll(${JSON.stringify(MORE_CHIP)})) {
    const box = chip.getBoundingClientRect();
    if (box.width > 0 && box.right > right) { right = box.right; best = chip.getAttribute("aria-label"); }
  }
  return best;
})()`;

const toFramesBottom = (limit: number): string => `(() => {
  let bottom = 0;
  for (const frame of document.querySelectorAll("iframe.frame")) {
    const box = frame.getBoundingClientRect();
    if (box.left < ${limit}) { bottom = Math.max(bottom, box.bottom); }
  }
  return bottom;
})()`;

const toFrontHeading = (page: Page): Locator =>
  page.frameLocator("iframe.frame.front").locator("h1").first();

const toChip = (page: Page, label: string): Locator =>
  page.locator(`${MORE_CHIP}[aria-label="${label}"]`);

const isShownSoon = async (page: Page, selector: string): Promise<boolean> => {
  try {
    await page
      .locator(selector)
      .first()
      .waitFor({ state: "visible", timeout: WAIT_MS });

    return true;
  } catch {
    return false;
  }
};

const setPanned = async (
  page: Page,
  target: PanTarget,
  step: number
): Promise<boolean> => {
  const [box, area] = await Promise.all([
    target.box.boundingBox(),
    page.evaluate<StageArea>(STAGE_AREA),
  ]);

  if (box === null) {
    return false;
  }

  const goal = target.toGoal(area);
  const deltaX = box.x + box.width - goal.width;
  const deltaY = box.y + box.height - goal.height;

  if (
    step >= PAN_STEPS ||
    (Math.abs(deltaX) < NEAR_PX && Math.abs(deltaY) < NEAR_PX)
  ) {
    return true;
  }

  await page.mouse.move(area.right - EDGE_PX * WHEEL_SPAN, EDGE_PX * 2);
  await page.mouse.wheel(deltaX, deltaY);
  await page.waitForTimeout(HOVER_MS);

  return setPanned(page, target, step + 1);
};

const setFit = async (page: Page): Promise<void> => {
  const area = await page.evaluate<StageArea>(STAGE_AREA);

  await page.mouse.click(area.left + EDGE_PX * 2, EDGE_PX * 2);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(HOVER_MS);
};

const setChipAtEdge = async (
  page: Page,
  row: number
): Promise<string | null> => {
  const label = await page.evaluate<string | null>(RIGHTMOST_CHIP);

  if (label === null) {
    return null;
  }

  const isPanned = await setPanned(
    page,
    {
      box: toChip(page, label),
      toGoal: (area) => ({
        height: area.bottom * row,
        width: area.right - EDGE_PX,
      }),
    },
    0
  );

  if (!isPanned) {
    return null;
  }

  return label;
};

const isFrameMenuOpen = async (page: Page, row: number): Promise<boolean> => {
  const label = await setChipAtEdge(page, row);

  if (label === null) {
    return false;
  }

  await toChip(page, label).dispatchEvent("click");

  return isShownSoon(page, FRAME_MENU);
};

const isRowOpen = async (
  page: Page,
  label: string,
  chipRow: number
): Promise<boolean> => {
  if (!(await isFrameMenuOpen(page, chipRow))) {
    return false;
  }

  const row = page
    .locator(FRAME_MENU)
    .getByRole("menuitem", { exact: true, name: label });

  try {
    await row.hover({ timeout: HOVER_MS });
  } catch {
    await row.focus();
  }

  await row.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(HOVER_MS);

  return isShownSoon(page, `.frame-submenu[aria-label="${label}"]`);
};

const isSubmenuOpen = async (page: Page, label: string): Promise<boolean> => {
  await setFit(page);

  return isRowOpen(page, label, CHIP_ROW);
};

const isToolsArrangeOpen = async (page: Page): Promise<boolean> => {
  await setFit(page);

  return isRowOpen(page, ARRANGE, LOW_ROW);
};

const isFitMenuOpen = async (page: Page): Promise<boolean> => {
  await setFit(page);

  return isFrameMenuOpen(page, CHIP_ROW);
};

const isPreviewMenuOpen = async (page: Page): Promise<boolean> => {
  await setFit(page);

  const heading = toFrontHeading(page);

  const isPanned = await setPanned(
    page,
    {
      box: heading,
      toGoal: (area) => ({
        height: area.bottom - EDGE_PX * 2,
        width: area.right - EDGE_PX,
      }),
    },
    0
  );

  if (!isPanned) {
    return false;
  }

  const box = await heading.boundingBox();

  if (box === null) {
    return false;
  }

  await page.mouse.click(box.x + box.width - NEAR_PX, box.y + box.height / 2, {
    button: "right",
  });

  if (!(await isShownSoon(page, ".preview-menu"))) {
    return false;
  }

  await page
    .locator(".preview-menu .preview-submenu-host > button")
    .first()
    .hover({ timeout: WAIT_MS });
  await page.waitForTimeout(HOVER_MS);

  return isShownSoon(page, ".preview-menu .preview-submenu");
};

const isFrameSelectOpen = async (page: Page): Promise<boolean> => {
  await setFit(page);

  const names = page.locator("button.frame-name");

  const [first, second] = await Promise.all([
    names.nth(0).boundingBox(),
    names.nth(1).boundingBox(),
  ]);

  if (first === null || second === null) {
    return false;
  }

  const right = second.x + second.width;

  const bottom = await page.evaluate<number>(toFramesBottom(right));

  await page.mouse.move(first.x - EDGE_PX / 2, bottom + EDGE_PX / 2);
  await page.mouse.down();
  await page.mouse.move(right, first.y - EDGE_PX / 2, { steps: 8 });
  await page.mouse.up();

  const count = '[data-testid="frame-select-count"]';

  if (!(await isShownSoon(page, count))) {
    return false;
  }

  await page.locator(count).first().click({ timeout: WAIT_MS });

  return isShownSoon(page, ".frame-select-menu");
};

const setNarrow = async (page: Page): Promise<void> => {
  const size = page.viewportSize();

  if (size !== null) {
    SIZES.set(page, size);
  }

  await page.setViewportSize(NARROW);
  await page.waitForTimeout(HOVER_MS);
};

const stopNarrow = async (page: Page): Promise<void> => {
  await stopOverlays(page);

  const size = SIZES.get(page) ?? null;

  if (size !== null) {
    await page.setViewportSize(size);
  }

  SIZES.delete(page);
};

const isPanelArrangeOpen = async (page: Page): Promise<boolean> => {
  await setNarrow(page);
  await setFit(page);

  const label = await setChipAtEdge(page, PANEL_ROW);

  if (label === null) {
    return false;
  }

  const name = label.replace("More actions for ", "");

  await page
    .locator(`button.frame-name[aria-label="${name} frame"]`)
    .click({ timeout: WAIT_MS });
  await page.waitForTimeout(HOVER_MS);

  const box = await toFrontHeading(page).boundingBox();

  if (box === null) {
    return false;
  }

  await page.mouse.click(box.x + NEAR_PX, box.y + box.height / 2);

  if (!(await isShownSoon(page, INSPECTOR))) {
    return false;
  }

  return isRowOpen(page, ARRANGE, PANEL_ROW);
};

const toMenuState = (
  name: string,
  open: (page: Page) => Promise<boolean>
): ClipState => ({ close: stopOverlays, name: `canvas menu ${name}`, open });

const toNarrowState = (
  name: string,
  open: (page: Page) => Promise<boolean>
): ClipState => ({
  close: stopNarrow,
  name: `canvas menu ${name} 900x700`,
  open: async (page) => {
    await setNarrow(page);

    return open(page);
  },
});

const toCanvasMenuStates = (): ClipState[] => [
  toMenuState("frame more at the right edge", isFitMenuOpen),
  ...SUBMENUS.map((label) =>
    toMenuState(`${label} submenu`, (page) => isSubmenuOpen(page, label))
  ),
  toMenuState("preview right-click", isPreviewMenuOpen),
  toMenuState("frame selection", isFrameSelectOpen),
  toNarrowState("frame more", isFitMenuOpen),
  ...SUBMENUS.map((label) =>
    toNarrowState(`${label} submenu`, (page) => isSubmenuOpen(page, label))
  ),
  toNarrowState("preview right-click", isPreviewMenuOpen),
  toNarrowState("Arrange submenu next to the tools bar", isToolsArrangeOpen),
  {
    close: stopNarrow,
    name: "canvas menu Arrange with the inspector open 900x700",
    open: isPanelArrangeOpen,
  },
];

export { toCanvasMenuStates };
