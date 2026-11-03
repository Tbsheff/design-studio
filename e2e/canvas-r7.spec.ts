import { writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  chooseRunSetting,
  closeRunSettings,
  createProjectViaUi,
  frontFrame,
  openHome,
  sendPrompt,
} from "./support/studio";

function variationFrame(page: Page, label: string) {
  return page.getByTestId("variation-frame").filter({
    has: page.locator(".frame-name .badge", {
      hasText: new RegExp(`^${label}$`),
    }),
  });
}

function passiveIframe(page: Page, directionId: string) {
  return page.locator(
    `.canvas-frame[data-direction-id="${directionId}"] > iframe.passive:not(.next)`
  );
}

async function zoomOf(page: Page): Promise<number> {
  const transform = await page
    .locator(".artboard")
    .evaluate((el) => (el as HTMLElement).style.transform);

  return Number(/scale\(([\d.]+)\)/.exec(transform)?.[1] ?? "1");
}

async function armIframeCounter(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __maxIframes: number };
    w.__maxIframes = document.querySelectorAll("iframe").length;
    new MutationObserver(() => {
      w.__maxIframes = Math.max(
        w.__maxIframes,
        document.querySelectorAll("iframe").length
      );
    }).observe(document.body, { childList: true, subtree: true });
  });
}

const page2 = (title: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1></body></html>`;

test("r7-3: variations open as frames; old frames load; a passive frame reloads only for its own direction; Keep removes the other two", async ({
  page,
}) => {
  const api = await openHome(page);

  const project = await createProjectViaUi(
    page,
    api,
    "Frames Variations",
    "html"
  );

  await api.waitForRuns(project.id, 1);
  await expect
    .soft(frontFrame(page).locator("h1"))
    .toHaveText("Frames Variations");
  const main = project.directions[0]!;

  await page.evaluate((pid) => {
    const old = {
      activeId: "f1",
      frames: [
        { id: "f1", width: 1440, height: 900, x: 0, y: 0 },
        { id: "f2", width: 390, height: 844, x: 1520, y: 0 },
      ],
    };

    localStorage.setItem(
      "design-studio.canvas.v1",
      JSON.stringify({ [pid]: old })
    );
  }, project.id);
  await page.reload();
  await expect.soft(page.locator(".canvas-frame")).toHaveCount(1);
  await expect
    .soft(page.locator(".canvas-frame iframe.passive:not(.next)"))
    .toHaveAttribute("src", new RegExp(`/${main.id}/`));
  await expect
    .soft(page.locator(".canvas-frame iframe.passive:not(.next)"))
    .toHaveAttribute("width", "390");

  await chooseRunSetting(page, { radio: "3 variations" });
  await closeRunSettings(page);
  await sendPrompt(page, "Landing page for a bike shop");
  await page
    .getByTestId("variation-brief-card")
    .getByRole("button", { name: "Start 3 variations" })
    .click();
  await expect.soft(page.getByTestId("variation-frame")).toHaveCount(3);
  await api.waitForRuns(project.id, 4);
  await expect
    .soft(page.getByTestId("variation-status"))
    .toHaveText(["Done", "Done", "Done"]);
  await expect.soft(page.locator(".frame-label")).toHaveCount(5);
  await expect
    .soft(page.getByTestId("variation-bar"))
    .toContainText("3 variations");

  const group = (await api.project(project.id)).directions.filter(
    (d) => d.variation
  );

  const [a, b, c] = group as [
    (typeof group)[0],
    (typeof group)[0],
    (typeof group)[0],
  ];

  for (const d of group) {
    await expect
      .soft(passiveIframe(page, d.id))
      .toHaveAttribute("src", new RegExp(`/${d.id}/`));
  }

  const stored = await page.evaluate(
    (pid) =>
      JSON.parse(localStorage.getItem("design-studio.canvas.v1") ?? "{}")[pid],
    project.id
  );

  expect
    .soft(stored.frames.map((f: { directionId?: string }) => f.directionId))
    .toEqual([main.id, main.id, a.id, b.id, c.id]);

  await page.waitForTimeout(1500);
  await armIframeCounter(page);

  const srcOf = async (id: string) =>
    passiveIframe(page, id).getAttribute("src");

  const before = {
    a: await srcOf(a.id),
    b: await srcOf(b.id),
    c: await srcOf(c.id),
  };

  writeFileSync(path.join(a.workTree, "index.html"), page2("Changed A"));
  await expect
    .soft(
      page
        .frameLocator(
          `.canvas-frame[data-direction-id="${a.id}"] > iframe.passive:not(.next)`
        )
        .locator("h1")
    )
    .toHaveText("Changed A");
  expect.soft(await srcOf(a.id)).not.toBe(before.a);
  expect.soft(await srcOf(b.id)).toBe(before.b);
  expect.soft(await srcOf(c.id)).toBe(before.c);

  writeFileSync(path.join(main.workTree, "index.html"), page2("Changed main"));
  await expect.soft(frontFrame(page).locator("h1")).toHaveText("Changed main");
  await page.waitForTimeout(600);
  expect.soft(await srcOf(b.id)).toBe(before.b);
  expect.soft(await srcOf(c.id)).toBe(before.c);

  const maxIframes = await page.evaluate(
    () => (window as unknown as { __maxIframes: number }).__maxIframes
  );

  console.log(`R7-3 max iframes ${maxIframes} for 5 frames`);
  expect.soft(maxIframes).toBeLessThanOrEqual(6);
  await expect.soft(page.locator("iframe")).toHaveCount(5);

  await page
    .locator(`.canvas-frame[data-direction-id="${a.id}"] > .frame-hit`)
    .click({ position: { x: 20, y: 20 } });
  await expect.soft(page.locator(".topbar")).toContainText("/ Variation A");
  await expect
    .soft(page.locator(".artboard"))
    .toHaveAttribute("data-direction-id", a.id);
  await expect.soft(frontFrame(page).locator("h1")).toHaveText("Changed A");
  await expect.soft(variationFrame(page, "A")).toHaveClass(/active/);
  await expect.soft(page.locator("iframe.frame.front")).toHaveCount(1);

  await variationFrame(page, "B")
    .getByRole("button", { name: "Keep this one" })
    .click();
  await expect.soft(page.getByTestId("variation-frame")).toHaveCount(1);
  await expect.soft(page.locator(".frame-label")).toHaveCount(3);
  await expect.soft(page.locator(".topbar")).toContainText("/ Variation B");
  await expect
    .soft(page.getByTestId("variation-kept"))
    .toContainText("Kept Variation B");
  expect.soft((await api.project(project.id)).directions).toHaveLength(4);

  await page
    .getByTestId("variation-bar")
    .getByRole("button", { name: "Show all" })
    .click();
  await expect.soft(page.getByTestId("variation-frame")).toHaveCount(3);
  await expect.soft(variationFrame(page, "B")).toHaveClass(/current/);
});

test("r7 page per frame: a frame shows another HTML page; bad paths are refused; the path survives a reload", async ({
  page,
}) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, "Pages Home", "html");
  await api.waitForRuns(project.id, 1);
  const main = project.directions[0]!;
  writeFileSync(path.join(main.workTree, "about.html"), page2("About us"));
  await page.getByRole("button", { exact: true, name: "Add frame" }).click();
  await page.getByRole("menuitem", { name: /Tablet 768/ }).click();
  const tablet = page.locator(".canvas-frame");
  await expect.soft(tablet).toHaveCount(1);

  const label = tablet.locator(".frame-label");
  await label.hover();
  await label.getByRole("button", { name: "Page: home" }).click();
  const menu = page.getByRole("dialog", { name: "Frame page" });
  await expect
    .soft(menu.getByRole("menuitem"))
    .toHaveText(["about.html", "index.html"]);
  await menu.getByRole("menuitem", { name: "about.html" }).click();
  await expect.soft(menu).toHaveCount(0);
  await expect
    .soft(tablet.locator("iframe.passive:not(.next)"))
    .toHaveAttribute("src", /\/about\.html\?/);
  await expect
    .soft(
      page
        .frameLocator(".canvas-frame > iframe.passive:not(.next)")
        .locator("h1")
    )
    .toHaveText("About us");
  await expect.soft(frontFrame(page).locator("h1")).toHaveText("Pages Home");

  await label.getByRole("button", { name: "Page: about.html" }).click();
  await menu.getByLabel("Path").fill("../secret.html");
  await menu.getByLabel("Path").press("Enter");
  await expect.soft(menu.getByText("No “..”")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect.soft(menu).toHaveCount(0);
  await expect
    .soft(tablet.locator("iframe.passive:not(.next)"))
    .toHaveAttribute("src", /\/about\.html\?/);

  await page.reload();
  await expect
    .soft(page.locator(".canvas-frame iframe.passive:not(.next)"))
    .toHaveAttribute("src", /\/about\.html\?/);
  await page
    .getByRole("button", { exact: true, name: "Tablet 768 frame" })
    .click();
  await expect.soft(frontFrame(page).locator("h1")).toHaveText("About us");
  await expect
    .soft(page.locator("iframe.frame.front"))
    .toHaveAttribute("src", /\/about\.html\?/);
});

test("r7 frame resize: edge and corner drags show W x H, Shift keeps the ratio, 240 is the floor, the live frame sets the viewport", async ({
  page,
}) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, "Resize Me", "html");
  await api.waitForRuns(project.id, 1);
  await expect.soft(frontFrame(page).locator("h1")).toHaveText("Resize Me");
  await page.getByRole("button", { exact: true, name: "Add frame" }).click();
  await page.getByRole("menuitem", { name: /Mobile 390/ }).click();
  await expect.soft(page.locator(".canvas-frame")).toHaveCount(1);
  await page.waitForTimeout(300);
  const zoom = await zoomOf(page);

  const right = await page
    .locator(".artboard > .frame-resize.right")
    .boundingBox();

  if (!right) {
    throw new Error("no right handle");
  }

  const x = right.x + right.width / 2;
  const y = right.y + right.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y, { steps: 5 });
  const wide = 1440 + Math.round(100 / zoom);
  await expect
    .soft(page.locator(".artboard > .frame-size-readout"))
    .toHaveText(`${wide} × 900`);
  await expect
    .soft(page.locator(".artboard > .frame-size-readout"))
    .toBeVisible();
  await page.mouse.up();
  await expect
    .soft(page.locator(".artboard > .frame-size-readout"))
    .toBeHidden();
  await expect
    .soft(page.locator(".artboard"))
    .toHaveAttribute("style", new RegExp(`width: ${wide}px`));
  await expect
    .soft(page.getByLabel("Width", { exact: true }))
    .toHaveValue(String(wide));
  await expect
    .soft(page.getByLabel("Height", { exact: true }))
    .toHaveValue("900");
  await expect
    .soft(page.locator(".artboard > iframe.front"))
    .toHaveAttribute("width", String(wide));

  await page.getByLabel("Zoom", { exact: true }).selectOption("fit");
  await page.waitForTimeout(200);
  const fitZoom = await zoomOf(page);
  const passive = page.locator(".canvas-frame");
  const corner = await passive.locator(".frame-resize.corner").boundingBox();

  if (!corner) {
    throw new Error("no corner");
  }

  const cx = corner.x + corner.width / 2;
  const cy = corner.y + corner.height / 2;
  await page.keyboard.down("Shift");
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 39 * fitZoom, cy + 10 * fitZoom, { steps: 4 });
  await expect
    .soft(passive.locator(".frame-size-readout"))
    .toHaveText(`429 × 928`);
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect
    .soft(passive)
    .toHaveAttribute("style", /width: 429px; height: 928px/);
  await expect
    .soft(page.getByLabel("Width", { exact: true }))
    .toHaveValue(String(wide));

  const bottom = await passive.locator(".frame-resize.bottom").boundingBox();

  if (!bottom) {
    throw new Error("no bottom");
  }

  await page.mouse.move(
    bottom.x + bottom.width / 2,
    bottom.y + bottom.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(bottom.x + bottom.width / 2, bottom.y - 3000, {
    steps: 4,
  });
  await page.mouse.up();
  await expect
    .soft(passive)
    .toHaveAttribute("style", /width: 429px; height: 240px/);

  await page.reload();
  await expect
    .soft(page.locator(".artboard"))
    .toHaveAttribute("style", new RegExp(`width: ${wide}px`));
  await expect
    .soft(page.locator(".canvas-frame"))
    .toHaveAttribute("style", /width: 429px; height: 240px/);
});
