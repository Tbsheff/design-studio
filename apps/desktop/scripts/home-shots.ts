import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";
import type { Page } from "playwright-core";

import { toUiOpenUrl } from "./studio-session.js";

const base = process.env.STUDIO_URL ?? "http://127.0.0.1:4970";
const out = path.resolve(process.argv[2] ?? "/tmp/polish-r1");
const prefix = process.argv[3] ?? "after";

mkdirSync(out, { recursive: true });

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function shot(page: Page, name: string, fullPage = false): Promise<void> {
  await page.waitForTimeout(400);
  await page.screenshot({
    fullPage,
    path: path.join(out, `${prefix}-${name}.png`),
  });
  console.log(`${prefix}-${name}.png`);
}

async function token(page: Page): Promise<string> {
  return (
    (await page.locator('meta[name="studio-token"]').getAttribute("content")) ??
    ""
  );
}

const toRouteCall =
  (page: Page, studioToken: string) => (route: string, body: unknown) =>
    page.evaluate(
      async ([r, b, t]) => {
        const res = await fetch(r as string, {
          body: JSON.stringify(b),
          headers: {
            "content-type": "application/json",
            "x-studio-token": t as string,
          },
          method: "POST",
        });
        if (!res.ok) {
          throw new Error(`fetch failed: ${res.status}`);
        }
        return res.json();
      },
      [route, body, studioToken] as const
    );

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  const page = await browser.newPage({
    deviceScaleFactor: 2,
    viewport: { height: 900, width: 1440 },
  });

  await page.goto(await toUiOpenUrl(base, null));

  await page.goto(base);
  await page.getByRole("heading", { name: "New project" }).waitFor();
  await shot(page, "home-first-run", true);

  await page.getByLabel("Describe the design").fill("Bakery landing page");
  await page.getByRole("button", { exact: true, name: "Create" }).click();
  await page.getByRole("heading", { name: "A few quick questions" }).waitFor();
  await page.locator(".clarify-q").first().getByRole("radio").first().click();
  await shot(page, "home-questions");
  await page.keyboard.press("Escape");

  await page.getByLabel("Describe the design").fill("");
  await page.getByLabel("Describe the design").focus();
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData("text/plain", "https://example.com/pricing");
    document.querySelector('[aria-label="Describe the design"]')?.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      })
    );
  });
  await page.setInputFiles('input[type="file"]', {
    buffer: PNG_1PX,
    mimeType: "image/png",
    name: "moodboard.png",
  });
  await page
    .getByLabel("Describe the design")
    .fill("A pricing page like this reference, with a calmer palette");
  await shot(page, "home-chips");

  const studioToken = await token(page);

  const call = toRouteCall(page, studioToken);

  for (const starterId of [
    "landing",
    "dashboard",
    "docs",
    "form",
    "mobile-app",
    "deck",
  ]) {
    await call("/api/projects/from-starter", { starterId });
  }

  await call("/api/projects/sample", {});
  await page.goto(base);
  await page.locator(".project-thumb img").nth(5).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.locator("#projects-heading").scrollIntoViewIfNeeded();
  await shot(page, "home-projects");
  await shot(page, "home-projects-full", true);

  const card = page.locator(".project-card").first();
  await card.hover();
  await card.getByRole("button", { name: /More actions/ }).click();
  await shot(page, "home-card-menu");
  await page.keyboard.press("Escape");

  await page.keyboard.press("/");
  await page.keyboard.type("doc");
  await shot(page, "home-search");
  await browser.close();
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  }
);
