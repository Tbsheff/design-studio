import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { Frame, Page } from "@playwright/test";

import {
  changedLines,
  evidence,
  evidencePath,
  importHtmlFixture,
  previewFrame,
  runFile,
} from "../../../scripts/ac-edit/helpers";
import { buildUserText } from "../../../src/server/agent/index";
import { PREVIEW_FRAGMENT } from "../../support/server";
import {
  frontFrame,
  mainDirection,
  sendPrompt,
  setSelectMode,
} from "../../support/studio";

const SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23396'/%3E%3C/svg%3E";

const FIXTURE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fixture</title>
<style>
body { margin: 0; font-family: sans-serif; color: #222; }
.card { padding: 16px; margin: 16px; border: 1px solid #ccc; }
.tall { height: 2400px; }
</style>
</head>
<body>
<header>
<h1 id="title">Fixture <span class="inner">nested <b class="deep">deep</b></span></h1>
</header>
<main>
<article class="card first">
<h2 class="card-title">Card one</h2>
<p class="card-body">Body one</p>
<img class="pic" alt="Green box" width="120" height="80" src="${SVG}">
<button class="btn" type="button" onclick="document.title = 'clicked'">Press</button>
<a class="out" href="https://example.com/">Go out</a>
<a class="hash" href="#below">Hash link</a>
</article>
<article class="card second">
<h2 class="card-title">Card two</h2>
<p class="card-body">Body two</p>
</article>
<div class="tall"></div>
<p id="below" class="far">Far below</p>
</main>
</body>
</html>
`;

async function frameOf(page: Page): Promise<Frame> {
  return previewFrame(page, PREVIEW_FRAGMENT);
}

async function compareRects(page: Page, selector: string) {
  const frame = await frameOf(page);
  const iframe = await page.locator("iframe.frame.front").boundingBox();

  if (!iframe) {
    throw new Error("no iframe box");
  }

  const width = Number(
    await page.locator("iframe.frame.front").getAttribute("width")
  );

  const zoom = iframe.width / width;

  const el = await frame.evaluate((sel) => {
    const r = document.querySelector(sel)?.getBoundingClientRect();

    return r ? { height: r.height, width: r.width, x: r.x, y: r.y } : null;
  }, selector);

  const box = await page
    .locator(".overlay .box.selected")
    .first()
    .boundingBox();

  if (!el || !box) {
    throw new Error("missing rect");
  }

  const expected = {
    height: el.height * zoom,
    width: el.width * zoom,
    x: iframe.x + el.x * zoom,
    y: iframe.y + el.y * zoom,
  };

  const delta = Math.max(
    Math.abs(expected.x - box.x),
    Math.abs(expected.y - box.y),
    Math.abs(expected.width - box.width),
    Math.abs(expected.height - box.height)
  );

  return { box, delta, expected, zoom };
}

test("aC-25 click nested span, image, button and links to select them", async ({
  page,
}) => {
  const { project } = await importHtmlFixture(page, FIXTURE);
  const frame = frontFrame(page);
  await expect.soft(frame.locator("h1")).toContainText("Fixture");
  const raw = await frameOf(page);
  const urlBefore = raw.url();
  await setSelectMode(page, true);
  const results: Record<string, unknown>[] = [];

  for (const [selector, tag] of [
    ["span.inner", "span"],
    ["b.deep", "b"],
    ["img.pic", "img"],
    ["button.btn", "button"],
    ["a.out", "a"],
    ["a.hash", "a"],
  ] as const) {
    await frame.locator(selector).click();
    await expect.soft(page.locator(".overlay .box.selected")).toHaveCount(1);
    await expect
      .soft(page.locator(".chip").first())
      .toHaveAttribute(
        "title",
        new RegExp(`${tag}(:nth-of-type\\(\\d+\\))?$`),
        { timeout: 5000 }
      )
      .catch(() => {});
    const chip = await page.locator(".chip").first().getAttribute("title");
    const chipText = await page.locator(".chip").first().textContent();
    const current = await frameOf(page);
    results.push({
      chipSelector: chip,
      chipText,
      frameUrlSame: current.url() === urlBefore,
      selector,
      title: await current.title(),
    });

    if (!chipText?.startsWith(tag)) {
      console.log(`[AC-25 mismatch] ${selector} -> ${chipText} ${chip}`);
    }

    expect.soft(chipText?.startsWith(tag)).toBe(true);
  }

  const frameCount = page
    .frames()
    .filter((f) => f.url().includes(PREVIEW_FRAGMENT)).length;

  const finalFrame = await frameOf(page);
  const scrollY = await finalFrame.evaluate(() => window.scrollY);
  evidence("AC-25", {
    frameCount,
    projectId: project.id,
    results,
    scrollYAfterHashClick: scrollY,
    urlAfter: finalFrame.url().split("?")[0],
    urlBefore: urlBefore.split("?")[0],
  });

  for (const row of results) {
    expect.soft(row.frameUrlSame).toBe(true);
    expect.soft(row.title).toBe("Fixture");
  }

  expect.soft(scrollY).toBe(0);
});

test("aC-26 selection highlight matches the element and leaves the DOM unchanged", async ({
  page,
}) => {
  const { project, folder } = await importHtmlFixture(page, FIXTURE);
  const frame = frontFrame(page);
  await expect.soft(frame.locator("h1")).toContainText("Fixture");
  const fileBefore = readFileSync(path.join(folder, "index.html"), "utf-8");

  const domBefore = await (
    await frameOf(page)
  ).evaluate(() => document.documentElement.outerHTML);

  await setSelectMode(page, true);
  await frame.locator("p.card-body").first().hover();
  await frame.locator("h2.card-title").first().click();
  await expect.soft(page.locator(".overlay .box.selected")).toHaveCount(1);

  const domAfterSelect = await (
    await frameOf(page)
  ).evaluate(() => document.documentElement.outerHTML);

  const at100 = await compareRects(page, "h2.card-title");
  await page.getByLabel("Zoom", { exact: true }).selectOption("0.5");
  await expect
    .poll(async () => (await compareRects(page, "h2.card-title")).zoom)
    .toBeCloseTo(0.5, 2);
  const at50 = await compareRects(page, "h2.card-title");
  await page.screenshot({ path: evidencePath("AC-26-zoom50.png") });
  await (await frameOf(page)).evaluate(() => window.scrollTo(0, 120));
  await expect
    .poll(async () => (await compareRects(page, "h2.card-title")).delta)
    .toBeLessThanOrEqual(2);
  const afterScroll = await compareRects(page, "h2.card-title");
  const scrolled = await (await frameOf(page)).evaluate(() => window.scrollY);
  await page.screenshot({ path: evidencePath("AC-26-scrolled.png") });
  await setSelectMode(page, false);

  const domEnd = await (
    await frameOf(page)
  ).evaluate(() => document.documentElement.outerHTML);

  const fileAfter = readFileSync(path.join(folder, "index.html"), "utf-8");
  evidence("AC-26", {
    afterScroll,
    at100,
    at50,
    domIdenticalAfterSelect: domBefore === domAfterSelect,
    domIdenticalAtEnd: domBefore === domEnd,
    domLength: domBefore.length,
    fileUnchanged: fileBefore === fileAfter,
    projectId: project.id,
    scrolled,
  });
  expect.soft(domAfterSelect).toBe(domBefore);
  expect.soft(domEnd).toBe(domBefore);
  expect.soft(fileAfter).toBe(fileBefore);
  expect.soft(at100.delta).toBeLessThanOrEqual(2);
  expect.soft(at50.delta).toBeLessThanOrEqual(2);
  expect.soft(afterScroll.delta).toBeLessThanOrEqual(2);
  expect.soft(scrolled).toBe(120);
});

test("aC-30 AC-32 AC-27 shift-select two elements, one prompt, one version with both changes", async ({
  page,
}) => {
  const { api, project, folder } = await importHtmlFixture(page, FIXTURE);
  const main = mainDirection(project);
  const frame = frontFrame(page);
  await expect.soft(frame.locator("h1")).toContainText("Fixture");
  const versionsBefore = await api.versions(project.id, main.id);
  const file = path.join(folder, "index.html");
  const before = readFileSync(file, "utf-8");
  await setSelectMode(page, true);
  await frame.locator(".card.first h2.card-title").click();
  await frame
    .locator(".card.second h2.card-title")
    .click({ modifiers: ["Shift"] });
  await expect.soft(page.locator(".overlay .box.selected")).toHaveCount(2);
  await expect.soft(page.locator(".chip")).toHaveCount(2);

  const otherColorsBefore = await frame
    .locator("h1, p, button, a")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));

  await sendPrompt(page, "color #c00");
  const runs = await api.waitForRuns(project.id, 1);
  const run = runs[0];

  if (!run) {
    throw new Error("run missing");
  }

  await expect
    .poll(() =>
      frame
        .locator("h2.card-title")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).color))
    )
    .toEqual(["rgb(204, 0, 0)", "rgb(204, 0, 0)"]);

  const otherColorsAfter = await frame
    .locator("h1, p, button, a")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));

  const versionsAfter = await api.versions(project.id, main.id);
  const after = readFileSync(file, "utf-8");
  const diff = changedLines(before, after);
  const stored = runFile(project.id, run.id);
  const userText = buildUserText({ designMd: "", request: stored.request });
  evidence("AC-30", {
    diff,
    newVersion: versionsAfter.find(
      (v) => !versionsBefore.some((b) => b.id === v.id)
    ),
    otherColorsSame:
      JSON.stringify(otherColorsBefore) === JSON.stringify(otherColorsAfter),
    runs: runs.length,
    versionsAfter: versionsAfter.length,
    versionsBefore: versionsBefore.length,
  });
  evidence("AC-27-html", {
    runFileSelection: stored.request.selection?.map((s) => ({
      ancestors: s.ancestors,
      outerHTML: s.outerHTML,
      selector: s.selector,
      source: s.source,
      styleKeys: Object.keys(s.styles).length,
      tag: s.tag,
    })),
    userText,
  });
  expect.soft(runs).toHaveLength(1);
  expect.soft(versionsAfter).toHaveLength(versionsBefore.length + 1);
  expect.soft(diff).toHaveLength(2);
  expect
    .soft(
      diff.every(
        (row) =>
          row.after.includes('class="card-title"') &&
          row.after.includes("color: #c00")
      )
    )
    .toBe(true);
  expect.soft(otherColorsAfter).toEqual(otherColorsBefore);
  expect.soft(stored.request.selection).toHaveLength(2);
  expect
    .soft(stored.request.selection?.map((s) => s.source?.line))
    .toEqual([18, 26]);
  expect.soft(userText).toContain("source: index.html:18:1");
  expect.soft(userText).toContain("source: index.html:26:1");
  expect.soft(userText.match(/styles: color: /g)?.length).toBe(2);
  expect.soft(userText.match(/outerHTML:/g)?.length).toBe(2);
});
