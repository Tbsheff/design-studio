import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { setTimeout as toDelay } from "node:timers/promises";

import type {
  AgentRunContext,
  AxeNode,
  AxeViolation,
  PreviewService,
  RenderPage,
} from "../../shared/server-ports.js";
import { logInfo } from "../platform/logger/index.js";
import {
  loadAxeSource,
  toSchemedPreview,
  waitForPage,
} from "../preview/page-capture/index.js";
import { withPagePath } from "../project-source/index.js";

type DarkContext = Pick<AgentRunContext, "direction" | "project">;

interface DarkMiss {
  readonly ratio: number | null;
  readonly selector: string;
}

interface DarkPage {
  readonly file: string;
  readonly misses: readonly DarkMiss[];
}

const DARK_VIEWPORT = { height: 900, width: 1440 };

const DARK_PAGES = 6;

const LISTED_LINES = 6;

const RENDER_TIMEOUT_MS = 12_000;

const RATIO_STEP = 10;

const CONTRAST_RULE = "color-contrast";

const DARK_BLOCK =
  /\.dark(?![\w-])|\[data-theme\s*=\s*["']?dark["']?\s*\]|prefers-color-scheme\s*:\s*dark/iu;

const LINK_TAG = /<link\b[^>]*>/giu;

const STYLE_BLOCK = /<style\b[^>]*>(?<css>[\s\S]*?)<\/style>/giu;

const STYLESHEET_REL = /\brel\s*=\s*["']?stylesheet\b/iu;

const LINK_HREF = /\bhref\s*=\s*["'](?<href>[^"']+)["']/iu;

const REMOTE_HREF = /^(?:[a-z][a-z\d+.-]*:|\/\/)/iu;

const CONTRAST_EXPRESSION = `window.axe.run(document, { runOnly: { type: 'rule', values: [${JSON.stringify(CONTRAST_RULE)}] }, resultTypes: ['violations'] }).then((result) => result.violations)`;

const toSourceText = async (
  workTree: string,
  file: string
): Promise<string> => {
  try {
    const root = await realpath(workTree);
    const target = await realpath(path.resolve(root, file));

    if (!target.startsWith(`${root}${path.sep}`)) {
      return "";
    }

    return await readFile(target, "utf-8");
  } catch {
    return "";
  }
};

const toStyleHref = (tag: string): string | null => {
  if (!STYLESHEET_REL.test(tag)) {
    return null;
  }

  const href = LINK_HREF.exec(tag)?.groups?.href ?? null;

  if (href === null || REMOTE_HREF.test(href)) {
    return null;
  }

  return href.split(/[?#]/u)[0] ?? null;
};

const listStyleFiles = (file: string, html: string): string[] =>
  [...html.matchAll(LINK_TAG)].flatMap((match) => {
    const href = toStyleHref(match[0]);

    if (href === null || href === "") {
      return [];
    }

    if (href.startsWith("/")) {
      return [href.slice(1)];
    }

    return [path.posix.join(path.posix.dirname(file), href)];
  });

const hasInlineDark = (html: string): boolean =>
  [...html.matchAll(STYLE_BLOCK)].some((match) =>
    DARK_BLOCK.test(match.groups?.css ?? "")
  );

const hasDarkValues = async (
  workTree: string,
  file: string
): Promise<boolean> => {
  const html = await toSourceText(workTree, file);

  if (hasInlineDark(html)) {
    return true;
  }

  const sheets = await Promise.all(
    listStyleFiles(file, html).map((sheet) => toSourceText(workTree, sheet))
  );

  return sheets.some((css) => DARK_BLOCK.test(css));
};

const toRatio = (node: AxeNode): number | null => {
  const ratio = (node.any ?? []).find((check) => check.id === CONTRAST_RULE)
    ?.data?.contrastRatio;

  if (!Number.isFinite(ratio)) {
    return null;
  }

  return Number(ratio);
};

const toMiss = (node: AxeNode): DarkMiss => ({
  ratio: toRatio(node),
  selector: node.target.map(String).join(" "),
});

const listContrastMisses = async (page: RenderPage): Promise<DarkMiss[]> => {
  await waitForPage(page);
  await page.evaluate(`${await loadAxeSource()}\n;0`);

  const violations = await page.evaluate<AxeViolation[]>(CONTRAST_EXPRESSION);

  return violations.flatMap((violation) => {
    if (violation.id !== CONTRAST_RULE) {
      return [];
    }

    return violation.nodes.map((node) => toMiss(node));
  });
};

const listDarkMisses = async (
  preview: PreviewService,
  url: string
): Promise<DarkMiss[]> => {
  const timer = new AbortController();

  if (!preview.withPage) {
    return [];
  }

  try {
    const render = preview.withPage(url, DARK_VIEWPORT, listContrastMisses);

    return await Promise.race([
      render,
      toDelay(RENDER_TIMEOUT_MS, [], { signal: timer.signal }),
    ]);
  } catch {
    return [];
  } finally {
    timer.abort();
  }
};

const inspectDarkPage = async (
  preview: PreviewService,
  base: string,
  file: string
): Promise<DarkPage> => ({
  file,
  misses: await listDarkMisses(preview, withPagePath(base, file)),
});

const toRatioText = (miss: DarkMiss): string => {
  if (miss.ratio === null) {
    return "";
  }

  return ` ${Math.round(miss.ratio * RATIO_STEP) / RATIO_STEP}:1`;
};

const toDarkLine = (page: DarkPage): string => {
  const [first] = page.misses;
  const count = page.misses.length;
  let head = `${count} text items on ${page.file} are`;
  let firstText = "";

  if (count === 1) {
    head = `1 text item on ${page.file} is`;
  }

  if (first) {
    firstText = ` (first: "${first.selector}"${toRatioText(first)})`;
  }

  return `- Dark: ${head} under AA contrast in dark${firstText}. Use token colors such as var(--fg), not raw colors, then take get_screenshot with colorScheme dark.`;
};

const toRestLine = (count: number): string =>
  `- Dark: ${count} more pages are under AA contrast in dark. Take get_screenshot with colorScheme dark on each page to see them all.`;

const getDarkBase = async (
  ctx: DarkContext,
  preview: PreviewService
): Promise<string | null> => {
  try {
    return await preview.directionUrl(ctx.project, ctx.direction);
  } catch {
    return null;
  }
};

const listDarkFiles = async (
  ctx: DarkContext,
  pages: readonly string[]
): Promise<string[]> => {
  const shown = pages.slice(0, DARK_PAGES);

  const marks = await Promise.all(
    shown.map((file) => hasDarkValues(ctx.direction.workTree, file))
  );

  return shown.filter((_file, index) => marks[index] === true);
};

const listDarkLines = async (
  ctx: DarkContext,
  preview: PreviewService,
  pages: readonly string[]
): Promise<string[]> => {
  if (pages.length === 0) {
    return [];
  }

  const files = await listDarkFiles(ctx, pages);

  if (files.length === 0) {
    logInfo("[agent] dark check: no page has dark values, so no dark render");

    return [];
  }

  const base = await getDarkBase(ctx, preview);

  if (base === null) {
    return [];
  }

  const start = Date.now();
  const dark = toSchemedPreview(preview, "dark");

  const shown = await Promise.all(
    files.map((file) => inspectDarkPage(dark, base, file))
  );

  logInfo(
    `[agent] dark check: rendered ${files.join(", ")} in ${Date.now() - start} ms`
  );

  const gaps = shown.filter((page) => page.misses.length > 0);

  const lines = gaps.slice(0, LISTED_LINES).map((page) => toDarkLine(page));

  if (gaps.length > LISTED_LINES) {
    lines.push(toRestLine(gaps.length - LISTED_LINES));
  }

  return lines;
};

export { listContrastMisses, listDarkLines };
