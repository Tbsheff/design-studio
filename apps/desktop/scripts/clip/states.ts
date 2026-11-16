import type { Page } from "playwright-core";

import { toCanvasMenuStates } from "./menu-states.ts";
import { stopOverlays } from "./session.ts";
import type { ClipState } from "./types.ts";

const WAIT_MS = 3000;
const TYPE_MS = 400;
const RELOAD_TIMEOUT_MS = 60_000;
const PANEL_DIGITS = ["1", "2", "3", "4", "6", "7"];
const MENU_ROLE = '[role="menu"]';
const SELECT_TOOL = 'fieldset.topbar-tools button[aria-label="Select"]';
const PRESENT_MENU = "button.topbar-present-more";

const TOOLS = [
  "Select",
  "Hand",
  "Frame",
  "Shape",
  "Pen",
  "Text",
  "Comment",
  "Prototype link",
];

const isVisible = async (page: Page, selector: string): Promise<boolean> => {
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

const isClicked = async (page: Page, selector: string): Promise<boolean> => {
  const target = page.locator(selector).first();

  if (!(await target.isVisible()) || !(await target.isEnabled())) {
    return false;
  }

  await target.click({ timeout: WAIT_MS });

  return true;
};

const isPaletteRun = async (page: Page, text: string): Promise<boolean> => {
  await page.keyboard.press("ControlOrMeta+KeyK");

  if (!(await isVisible(page, "dialog.cmdk"))) {
    return false;
  }

  await page.keyboard.type(text);
  await page.waitForTimeout(TYPE_MS);
  await page.keyboard.press("Enter");

  return true;
};

const isOpenedBy = async (
  page: Page,
  trigger: string,
  command: string,
  shown: string
): Promise<boolean> => {
  if (await isClicked(page, trigger)) {
    return isVisible(page, shown);
  }

  if (command === "") {
    return false;
  }

  return (await isPaletteRun(page, command)) && isVisible(page, shown);
};

const isPresentItemRun = async (
  page: Page,
  item: string,
  shown: string
): Promise<boolean> => {
  if (!(await isClicked(page, PRESENT_MENU))) {
    return (await isPaletteRun(page, item)) && isVisible(page, shown);
  }

  await page.getByRole("menuitem", { name: item }).click({ timeout: WAIT_MS });

  return isVisible(page, shown);
};

const isFrameSelected = async (page: Page): Promise<boolean> => {
  await isClicked(page, SELECT_TOOL);

  const box = await page
    .frameLocator("iframe.frame.front")
    .locator("h1")
    .first()
    .boundingBox();

  if (box === null) {
    return false;
  }

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  return isVisible(page, "aside.studio-inspector:not([hidden])");
};

const setSelectTool = async (page: Page): Promise<void> => {
  await stopOverlays(page);
  await isClicked(page, SELECT_TOOL);
};

const toPanelState = (index: string): ClipState => {
  const chord = `Alt+Digit${index}`;

  return {
    close: async (page) => {
      await page.keyboard.press(chord);
      await stopOverlays(page);
    },
    name: `panel Alt+${index}`,
    open: async (page) => {
      await page.keyboard.press(chord);

      return isVisible(page, '.studio[data-column="open"]');
    },
  };
};

const toToolState = (label: string): ClipState => ({
  close: setSelectTool,
  name: `tool ${label}`,
  open: (page) =>
    isClicked(page, `fieldset.topbar-tools button[aria-label="${label}"]`),
});

const toOverlayState = (
  name: string,
  open: (page: Page) => Promise<boolean>
): ClipState => ({ close: stopOverlays, name, open });

const toPanelStates = (): ClipState[] =>
  PANEL_DIGITS.map((digit) => toPanelState(digit));

const toTopBarStates = (): ClipState[] => [
  toOverlayState("present menu", async (page) => {
    const isOpen = await isClicked(page, PRESENT_MENU);

    return isOpen && isVisible(page, MENU_ROLE);
  }),
  toOverlayState("play", (page) =>
    isPresentItemRun(page, "Play prototype", '[data-testid="play-layer"]')
  ),
  toOverlayState("present", (page) =>
    isOpenedBy(page, "button.topbar-present", "", ".present-layer")
  ),
  toOverlayState("review", (page) =>
    isOpenedBy(page, "button.topbar-review", "", ".review-panel")
  ),
  toOverlayState("share", (page) =>
    isOpenedBy(page, "button.topbar-share", "", "dialog.share-dialog")
  ),
  toOverlayState("share menu", (page) =>
    isOpenedBy(page, "button.topbar-share-more", "", MENU_ROLE)
  ),
  toOverlayState("connect ai", (page) =>
    isOpenedBy(
      page,
      '[data-testid="topbar-connect-ai"]',
      "Connect AI",
      '[data-testid="connect-ai-dialog"]'
    )
  ),
];

const toComposerStates = (): ClipState[] => [
  toOverlayState("command palette", async (page) => {
    await page.keyboard.press("ControlOrMeta+KeyK");

    return isVisible(page, "dialog.cmdk");
  }),
  toOverlayState("composer plus menu", (page) =>
    isOpenedBy(page, '[data-testid="composer-plus"]', "", ".composer-menu")
  ),
  toOverlayState("level pill menu", (page) =>
    isOpenedBy(page, '[data-testid="level-pill"]', "", MENU_ROLE)
  ),
  toOverlayState("model pill", (page) =>
    isOpenedBy(page, ".model-pill", "", '[role="dialog"], dialog[open]')
  ),
];

const isEditorReady = async (page: Page): Promise<boolean> => {
  const [isToolShown, modals] = await Promise.all([
    page.locator(SELECT_TOOL).first().isVisible(),
    page
      .locator('dialog[open], [aria-modal="true"], [data-testid="play-layer"]')
      .count(),
  ]);

  return isToolShown && modals === 0;
};

const setEditorReady = async (page: Page): Promise<boolean> => {
  if (await isEditorReady(page)) {
    return false;
  }

  await page.reload();
  await page
    .frameLocator("iframe.frame.front")
    .locator("h1")
    .first()
    .waitFor({ timeout: RELOAD_TIMEOUT_MS });

  return true;
};

const toEditorStates = (): ClipState[] => [
  ...toPanelStates(),
  toOverlayState("inspector", isFrameSelected),
  ...TOOLS.map((label) => toToolState(label)),
  ...toTopBarStates(),
  ...toComposerStates(),
  ...toCanvasMenuStates(),
];

export { setEditorReady, toEditorStates };
