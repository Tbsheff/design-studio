import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, expect, test } from "@playwright/test";

import { BASE_URL } from "../../support/server";
import {
  createProjectViaUi,
  frontFrame,
  headVersion,
  openHome,
} from "../../support/studio";
import type { StudioApi } from "../../support/studio";
import { saveResult } from "./helpers";

const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

async function exportTo(
  api: StudioApi,
  pid: string,
  vid: string,
  label: string
): Promise<string> {
  const res = await fetch(
    `${BASE_URL}/api/projects/${pid}/versions/${vid}/export`,
    { headers: { "x-studio-token": api.token } }
  );

  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("application/zip");

  const dir = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), `ac export ${label} `))
  );

  const zip = path.join(dir, "export.zip");
  writeFileSync(zip, new Uint8Array(await res.arrayBuffer()));
  const out = path.join(dir, "unzipped");
  execFileSync("unzip", ["-q", zip, "-d", out]);

  return out;
}

async function openOffline(indexFile: string): Promise<{
  h1: string | null;
  blocked: string[];
  allowed: string[];
  pageErrors: string[];
}> {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const blocked: string[] = [];
  const allowed: string[] = [];
  const pageErrors: string[] = [];

  try {
    const context = await browser.newContext();
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());

      if (
        url.protocol === "file:" ||
        url.protocol === "data:" ||
        FONT_HOSTS.has(url.hostname)
      ) {
        if (url.protocol !== "file:") {
          allowed.push(url.href);
        }

        return route.continue();
      }

      blocked.push(url.href);

      return route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(pathToFileURL(indexFile).href);
    await page.waitForTimeout(500);

    const h1 = await page
      .locator("h1")
      .first()
      .textContent()
      .catch(() => null);

    return { allowed, blocked, h1, pageErrors };
  } finally {
    await browser.close();
  }
}

test("aC-56: standalone HTML export opens from file:// with network blocked", async ({
  page,
}) => {
  const api = await openHome(page);

  const project = await createProjectViaUi(
    page,
    api,
    "Export html page",
    "html"
  );

  await api.waitForRuns(project.id, 1);
  await expect
    .soft(frontFrame(page).locator("h1"))
    .toHaveText("Export html page");
  const head = await headVersion(api, project.id, "main");
  const out = await exportTo(api, project.id, head.id, "html");
  const files = readdirSync(out, { recursive: true }).map(String);
  const html = readFileSync(path.join(out, "index.html"), "utf-8");
  const offline = await openOffline(path.join(out, "index.html"));

  const externalUrls = [
    ...html.matchAll(/(?:src|href)=["'](https?:[^"']+)["']/g),
  ].map((match) => match[1]);

  const result = {
    externalUrls,
    files,
    hasBridge: html.includes("bridge.js"),
    hasLocAttr: html.includes("data-studio-loc"),
    offline,
  };

  saveResult("ac56-mock", result);
  expect.soft(offline.h1).toBe("Export html page");
  expect.soft(result.hasBridge).toBe(false);
  expect.soft(result.hasLocAttr).toBe(false);
  expect.soft(offline.pageErrors).toEqual([]);
});

test("aC-57: React export is a normal buildable Vite app", async ({ page }) => {
  test.setTimeout(600_000);
  const api = await openHome(page);

  const project = await createProjectViaUi(
    page,
    api,
    "Export react page",
    "react"
  );

  await api.waitForRuns(project.id, 1, 180_000);
  await expect
    .soft(frontFrame(page).locator("h1"))
    .toHaveText("Export react page", {
      timeout: 90_000,
    });
  const head = await headVersion(api, project.id, "main");
  const out = await exportTo(api, project.id, head.id, "react");

  const files = readdirSync(out, { recursive: true })
    .map(String)
    .filter((file) => !file.startsWith("node_modules"));

  const viteConfig = readFileSync(path.join(out, "vite.config.ts"), "utf-8");

  const pkg = JSON.parse(
    readFileSync(path.join(out, "package.json"), "utf-8")
  ) as { scripts: Record<string, string> };

  const install = execFileSync("npm", ["install", "--no-audit", "--no-fund"], {
    cwd: out,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const build = execFileSync("npm", ["run", "build"], {
    cwd: out,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const distIndex = path.join(out, "dist", "index.html");

  const distHtml = existsSync(distIndex)
    ? readFileSync(distIndex, "utf-8")
    : "";

  const bundle = readdirSync(path.join(out, "dist", "assets")).filter((file) =>
    file.endsWith(".js")
  );

  const bundleText = bundle
    .map((file) =>
      readFileSync(path.join(out, "dist", "assets", file), "utf-8")
    )
    .join("\n");

  const result = {
    buildTail: build.trim().split("\n").slice(-5),
    bundleHasHeading: bundleText.includes("Export react page"),
    bundleHasLocAttr: bundleText.includes("data-studio-loc"),
    distHasBridge:
      distHtml.includes("bridge.js") || bundleText.includes("__studio"),
    distHasIndex: distHtml.length > 0,
    files,
    installTail: install.trim().split("\n").slice(-2),
    out,
    scripts: pkg.scripts,
    viteConfigHasStudio: /studio/i.test(viteConfig),
  };

  saveResult("ac57", result);
  expect.soft(result.distHasIndex).toBe(true);
  expect.soft(result.viteConfigHasStudio).toBe(false);
  expect.soft(result.bundleHasHeading).toBe(true);
  expect.soft(result.bundleHasLocAttr).toBe(false);
  expect.soft(result.distHasBridge).toBe(false);
});
