import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { BrowserPool } from "../src/server/preview/index";
import { wantsElectronRenderer } from "./support/render-host";
import { ROOT } from "./support/server";

const FIXTURE = readFileSync(
  path.join(ROOT, "e2e", "fixtures", "layout-clipping.html"),
  "utf-8"
);

let server: Server;
let pool: BrowserPool;
let url = "";
let outDir = "";

test.beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(FIXTURE);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/index.html`;
  pool = new BrowserPool("http://127.0.0.1");
  outDir = mkdtempSync(path.join(os.tmpdir(), "studio-layout-check-"));
});

test.afterAll(async () => {
  await pool.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(outDir, { force: true, recursive: true });
});

test("render_check reports a sideways-scrolling table and a clipped nav at 390px, with selectors and cut items", async () => {
  const results = await pool.renderCheck(url, outDir, "fixture");
  expect
    .soft(results.map((result) => result.backend))
    .toEqual(
      results.map(() => (wantsElectronRenderer() ? "electron" : "playwright"))
    );
  const mobile = results.find((result) => result.viewport === "mobile");
  const desktop = results.find((result) => result.viewport === "desktop");
  expect.soft(mobile?.horizontalOverflow).toBe(false);

  const nav = mobile?.layout.find((finding) =>
    finding.selector.includes("nav.site-nav")
  );

  expect
    .soft(nav)
    .toMatchObject({ axis: "x", kind: "clipped", severity: "error" });
  expect.soft(nav?.cutItems).toContain("Settings");
  expect.soft(nav?.scrollSize).toBeGreaterThan(nav?.clientSize ?? Infinity);

  const table = mobile?.layout.find((finding) =>
    finding.selector.includes("div.table-wrap")
  );

  expect.soft(table).toMatchObject({
    axis: "x",
    kind: "scrolls-sideways",
    severity: "warning",
  });
  expect.soft(table?.cutItems.length).toBeGreaterThan(0);
  expect.soft(table?.detail).toMatch(/scroll sideways/);

  expect
    .soft(
      mobile?.layout.some(
        (finding) =>
          finding.selector.includes("sr-only") ||
          finding.selector.includes("truncate") ||
          finding.selector.includes("offscreen")
      )
    )
    .toBe(false);
  expect.soft(mobile?.layout.length).toBeLessThanOrEqual(10);
  expect.soft(desktop?.layout).toEqual([]);
  expect.soft(desktop?.layoutTotal).toBe(0);
});

test("screenshotTiles returns viewport-wide tiles from an offset and reports the page height", async () => {
  const tiles = await pool.screenshotTiles(url, {
    from: 0,
    maxTiles: 2,
    outPrefix: path.join(outDir, "tile"),
    tileHeight: 200,
    viewport: { height: 844, width: 390 },
  });

  expect.soft(tiles.paths.length).toBeGreaterThan(0);
  expect.soft(tiles.from).toBe(0);
  expect.soft(tiles.to).toBeLessThanOrEqual(tiles.pageHeight);
  const png = readFileSync(tiles.paths[0] ?? "");
  expect.soft(png.readUInt32BE(16)).toBe(390);
});
