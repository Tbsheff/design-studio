import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { BrowserPool, navFindings } from "../src/server/preview/index";
import { ROOT } from "./support/server";

const FIXTURE = readFileSync(
  path.join(ROOT, "e2e", "fixtures", "quality-checks.html"),
  "utf-8"
);

const GENERIC = readFileSync(
  path.join(ROOT, "e2e", "fixtures", "pricing-generic.html"),
  "utf-8"
);

const TABLE_FIRST = readFileSync(
  path.join(ROOT, "e2e", "fixtures", "pricing-table-first.html"),
  "utf-8"
);

const TABLE_THEN_CARDS = readFileSync(
  path.join(ROOT, "e2e", "fixtures", "pricing-table-then-cards.html"),
  "utf-8"
);

const DOUBLED = readFileSync(
  path.join(ROOT, "e2e", "fixtures", "pricing-doubled.html"),
  "utf-8"
);

const CTAS = `<!doctype html><html><body><main>
<section><h2>Team</h2><p>For growing teams.</p><a href="/signup?plan=team">Start trial</a></section>
<section><h2>Why Plotline</h2><p>Fast answers.</p><a href="/signup?plan=team">Start trial</a></section>
<section><h2>Ready?</h2><p>Sticky bar.</p><a data-studio-repeat href="/signup?plan=team">Start trial</a></section>
<section><h2>Other</h2><p>Other plan.</p><a href="/signup?plan=pro">Start trial</a></section>
<details><summary>More</summary><a href="/signup?plan=team">Start trial</a></details>
</main></body></html>`;

const RESPONSIVE = readFileSync(
  path.join(ROOT, "e2e", "fixtures", "pricing-responsive.html"),
  "utf-8"
);

const WITH_MENU = FIXTURE.replace(
  "<header>",
  '<header><button aria-expanded="false" aria-controls="menu" class="big">Menu</button>'
);

let server: Server;
let pool: BrowserPool;
let base = "";
let outDir = "";

test.beforeAll(async () => {
  server = createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });

    const pages: Record<string, string> = {
      "/ctas.html": CTAS,
      "/doubled.html": DOUBLED,
      "/generic.html": GENERIC,
      "/menu.html": WITH_MENU,
      "/responsive.html": RESPONSIVE,
      "/table-first.html": TABLE_FIRST,
      "/table-then-cards.html": TABLE_THEN_CARDS,
    };

    res.end(pages[(req.url ?? "").split("?")[0] ?? ""] ?? FIXTURE);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  pool = new BrowserPool("http://127.0.0.1");
  outDir = mkdtempSync(path.join(os.tmpdir(), "studio-quality-check-"));
});

test.afterAll(async () => {
  await pool.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(outDir, { force: true, recursive: true });
});

const OPTIONS = {
  placeholder: "high" as const,
  quality: true,
  viewports: ["desktop", "tablet", "mobile"] as const,
};

test("quality checks find contrast, alt, label, tap-target and placeholder problems, with timings", async () => {
  const results = await pool.renderCheck(`${base}/index.html`, outDir, "q", {
    ...OPTIONS,
    viewports: [...OPTIONS.viewports],
  });

  expect
    .soft(results.map((result) => result.viewport))
    .toEqual(["desktop", "tablet", "mobile"]);
  const desktop = results.find((result) => result.viewport === "desktop");
  const mobile = results.find((result) => result.viewport === "mobile");

  const a11y = (desktop?.quality ?? [])
    .filter((finding) => finding.check === "a11y")
    .map((finding) => finding.message.split(":")[0]);

  expect
    .soft(a11y)
    .toEqual(expect.arrayContaining(["color-contrast", "image-alt", "label"]));
  expect
    .soft(
      desktop?.quality?.find((finding) =>
        finding.message.startsWith("color-contrast")
      )?.severity
    )
    .toBe("high");

  const taps = (mobile?.quality ?? []).filter(
    (finding) => finding.check === "tap-target"
  );

  expect
    .soft(
      taps.find((finding) => finding.selector?.includes("button.tiny"))
        ?.severity
    )
    .toBe("high");
  expect
    .soft(taps.some((finding) => finding.selector?.includes("button.extended")))
    .toBe(false);
  expect
    .soft(taps.some((finding) => finding.selector?.includes("button.big")))
    .toBe(false);
  expect
    .soft(taps.some((finding) => finding.message.includes('"terms"')))
    .toBe(false);

  const placeholders = (desktop?.quality ?? []).filter(
    (finding) => finding.check === "placeholder"
  );

  expect
    .soft(
      placeholders.find((finding) => finding.selector?.includes("p#draft"))
        ?.severity
    )
    .toBe("high");
  expect
    .soft(
      placeholders.find((finding) => finding.message.includes("Sample data"))
        ?.severity
    )
    .toBe("low");
  expect
    .soft(
      placeholders.find((finding) => finding.selector?.includes("p#mail"))
        ?.severity
    )
    .toBe("high");
  expect
    .soft(mobile?.quality?.some((finding) => finding.check === "placeholder"))
    .toBe(false);

  for (const result of results) {
    expect.soft(result.timingsMs?.total).toBeLessThan(5000);
  }
});

test("the nav rule flags a desktop nav that mobile hides with no menu, and accepts a menu button", async () => {
  const hidden = await pool.renderCheck(`${base}/index.html`, outDir, "n1", {
    quality: false,
    viewports: ["desktop", "mobile"],
  });

  expect.soft(hidden[0]?.nav?.visibleLinks).toBe(4);
  expect
    .soft(hidden[1]?.nav)
    .toMatchObject({ menuControl: false, visibleLinks: 0 });
  expect
    .soft(navFindings(hidden))
    .toMatchObject([
      { check: "nav-mobile", severity: "high", viewport: "mobile" },
    ]);

  const menu = await pool.renderCheck(`${base}/menu.html`, outDir, "n2", {
    quality: false,
    viewports: ["desktop", "mobile"],
  });

  expect.soft(menu[1]?.nav?.menuControl).toBe(true);
  expect.soft(navFindings(menu)).toEqual([]);
});

test("wireframe-style checks skip quality probes", async () => {
  const results = await pool.renderCheck(`${base}/index.html`, outDir, "w", {
    placeholder: "off",
    quality: false,
    viewports: ["desktop", "mobile"],
  });

  expect
    .soft(results.every((result) => (result.quality ?? []).length === 0))
    .toBe(true);
});

test("the generic-layout check names the stock pricing pattern and passes a table-first page", async () => {
  const generic = await pool.renderCheck(`${base}/generic.html`, outDir, "g1", {
    quality: true,
    viewports: ["desktop", "mobile"],
  });

  const found = (generic[0]?.quality ?? []).filter(
    (finding) => finding.check === "generic-layout"
  );

  expect.soft(found).toHaveLength(1);
  expect
    .soft(found[0])
    .toMatchObject({ severity: "medium", viewport: "desktop" });
  expect
    .soft(found[0]?.message)
    .toContain(
      "three equal plan cards in one row with the middle one filled or raised, then a comparison table, then an FAQ"
    );
  expect
    .soft(
      (generic[1]?.quality ?? []).some(
        (finding) => finding.check === "generic-layout"
      )
    )
    .toBe(false);

  const tableFirst = await pool.renderCheck(
    `${base}/table-first.html`,
    outDir,
    "g2",
    { quality: true, viewports: ["desktop"] }
  );

  expect
    .soft(
      (tableFirst[0]?.quality ?? []).some(
        (finding) => finding.check === "generic-layout"
      )
    )
    .toBe(false);
  expect.soft(generic[0]?.timingsMs?.total).toBeLessThan(5000);

  const moved = await pool.renderCheck(
    `${base}/table-then-cards.html`,
    outDir,
    "g3",
    { quality: true, viewports: ["desktop"] }
  );

  expect
    .soft(
      (moved[0]?.quality ?? []).some(
        (finding) => finding.check === "generic-layout"
      )
    )
    .toBe(false);
});

test("duplicate-content flags the prices and plans doubled by run g at desktop, and passes a cards-on-mobile, table-on-desktop page", async () => {
  const doubled = await pool.renderCheck(`${base}/doubled.html`, outDir, "d1", {
    quality: true,
    viewports: ["desktop", "mobile"],
  });

  const desktop = (doubled[0]?.quality ?? []).filter(
    (finding) => finding.check === "duplicate-content"
  );

  const texts = desktop.map((finding) => finding.message);
  expect
    .soft(desktop.every((finding) => finding.severity === "medium"))
    .toBe(true);

  for (const price of ["$19/mo", "$49/mo", "$129/mo"]) {
    expect
      .soft(
        texts.some((text) =>
          text.includes(`"${price}" shows 2 times at desktop`)
        )
      )
      .toBe(true);
  }

  const responsive = await pool.renderCheck(
    `${base}/responsive.html`,
    outDir,
    "d2",
    { quality: true, viewports: ["desktop", "mobile"] }
  );

  for (const result of responsive) {
    expect
      .soft(
        (result.quality ?? []).filter(
          (finding) => finding.check === "duplicate-content"
        )
      )
      .toEqual([]);
  }

  const ctas = await pool.renderCheck(`${base}/ctas.html`, outDir, "d3", {
    quality: true,
    viewports: ["desktop"],
  });

  const ctaHits = (ctas[0]?.quality ?? []).filter(
    (finding) => finding.check === "duplicate-content"
  );

  expect
    .soft(ctaHits.map((finding) => finding.message))
    .toEqual([
      expect.stringContaining('"Start trial" shows 2 times at desktop'),
    ]);
});
