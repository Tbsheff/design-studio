import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QualityFinding } from "../../shared/contracts.js";
import type { LayoutRegion, PageOwner } from "../../shared/run-target.js";
import type { PreviewService } from "../types.js";
import { LAYOUT_EXPRESSION } from "./layout-region.probe.js";

export type {
  LayoutBox,
  LayoutCard,
  LayoutRegion,
  PageOwner,
} from "../../shared/run-target.js";

const DESKTOP = { width: 1440, height: 900 };
const PROBE_TIMEOUT_MS = 20_000;

function withTimeout<T>(task: Promise<T>, ms: number): Promise<T | null> {
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });

  return Promise.race([task, timeout]).finally(() => clearTimeout(timer));
}

export async function probeLayout(
  preview: PreviewService,
  url: string
): Promise<LayoutRegion | null> {
  if (!preview.withPage) {
    return null;
  }

  const run = preview.withPage(url, DESKTOP, (page) =>
    page.evaluate<LayoutRegion | null>(LAYOUT_EXPRESSION)
  );

  return withTimeout(
    run.catch(() => null),
    PROBE_TIMEOUT_MS
  );
}

const JSX_ROOT = /return\s*\(?\s*<([A-Z][\w.]*)/;

function importPath(source: string, name: string): string | null {
  const named = new RegExp(
    `import\\s*(?:\\w+\\s*,\\s*)?\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`
  );

  const fallback = new RegExp(
    `import\\s+${name}\\s*(?:,[^;]*)?from\\s*["']([^"']+)["']`
  );

  return named.exec(source)?.[1] ?? fallback.exec(source)?.[1] ?? null;
}

async function readFirst(
  workTree: string,
  base: string
): Promise<{ file: string; text: string } | null> {
  for (const suffix of [
    "",
    ".tsx",
    ".ts",
    ".jsx",
    ".js",
    "/index.tsx",
    "/index.ts",
    "/index.jsx",
    "/index.js",
  ]) {
    const file = `${base}${suffix}`;

    const text = await readFile(path.join(workTree, file), "utf-8").catch(
      () => null
    );

    if (text !== null) {
      return { file, text };
    }
  }

  return null;
}

export async function pageOwner(
  workTree: string,
  routeFile: string
): Promise<PageOwner | null> {
  const source = await readFile(path.join(workTree, routeFile), "utf-8").catch(
    () => null
  );

  if (!source || /<main\b/.test(source)) {
    return null;
  }

  const name = JSX_ROOT.exec(source)?.[1]?.split(".")[0];
  const spec = name ? importPath(source, name) : null;

  if (!name || !spec?.startsWith(".")) {
    return null;
  }

  const found = await readFirst(
    workTree,
    path.posix.join(path.posix.dirname(routeFile), spec)
  );

  return found
    ? { name, file: found.file, hasMain: /<main\b/.test(found.text) }
    : null;
}

function regionText(region: LayoutRegion): string {
  const b = region.columnBox ?? region.mainBox;
  const column = region.column ? ` > ${region.column}` : "";

  return `${region.main}${column} (${b.width}x${b.height} at ${b.x},${b.y} on desktop)`;
}

export function layoutLines(
  region: LayoutRegion | null | undefined,
  owner: PageOwner | null | undefined,
  routeFile: string | null
): string[] {
  const lines: string[] = [];

  if (region) {
    lines.push(
      `main content region: ${regionText(region)}${region.owners.length ? `, rendered by <${region.owners[0]}>` : ""}. New UI goes inside it, in the section it belongs to, never above or beside the element that holds <main>.`
    );
  }

  if (owner) {
    lines.push(
      `page content owner: <${owner.name}> in ${owner.file}${owner.hasMain ? " (it renders <main>)" : ""}. ${routeFile ?? "The route file"} only renders it, so edit ${owner.file}, not the route file.`
    );
  }

  return lines;
}

function addedOutside(
  before: Record<string, number>,
  after: Record<string, number>
): string[] {
  return Object.entries(after).flatMap(([key, count]) =>
    count > (before[key] ?? 0) ? [key] : []
  );
}

export function outsideFindings(
  baseline: LayoutRegion | null,
  now: LayoutRegion | null,
  owner: PageOwner | null | undefined
): QualityFinding[] {
  if (!baseline || !now) {
    return [];
  }

  const into = owner ? ` in ${owner.file} (<${owner.name}>)` : "";

  return addedOutside(baseline.outside, now.outside)
    .slice(0, 3)
    .map((element) => ({
      check: "outside-layout",
      severity: "high",
      viewport: "desktop",
      selector: element,
      source: null,
      message: `New element ${element} renders outside the main layout box ${regionText(now)}. It sits above or beside the app layout, not in the page content.`,
      fix: `Move it inside ${now.column ?? now.main}${into}, in the section it belongs to.`,
    }));
}
