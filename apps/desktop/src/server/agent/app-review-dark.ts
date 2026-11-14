import path from "node:path";
import { setTimeout as toDelay } from "node:timers/promises";

import { SOURCE_LOC_ATTR } from "@design-studio/contracts";

import type {
  AgentRunContext,
  PreviewService,
  RenderPage,
} from "../../shared/server-ports.js";
import { getAppTokensIn } from "../design-system/index.js";
import { toAppSourceBody } from "../page-probe/index.js";
import { logInfo } from "../platform/logger/index.js";
import { toSchemedPreview } from "../preview/page-capture/index.js";
import { isNearChanged } from "./app-review-kit.js";
import { listContrastMisses, toPhotoLine } from "./prototype-dark-review.js";
import type { DarkMiss } from "./prototype-dark-review.js";
import { toChangedEntry } from "./screens.js";
import type { ChangedFile } from "./screens.js";

type AppDarkContext = Pick<AgentRunContext, "direction" | "project">;

interface AppDarkItem extends DarkMiss {
  readonly line: number | null;
  readonly source: string | null;
}

interface AppDarkFile {
  readonly file: string;
  readonly items: readonly AppDarkItem[];
}

interface AppDarkCheck {
  readonly count: number | null;
  readonly lines: readonly string[];
  readonly oldCode: number;
}

const DARK_VIEWPORT = { height: 900, width: 1440 };

const RENDER_TIMEOUT_MS = 12_000;

const LISTED_LINES = 6;

const RATIO_STEP = 10;

const NOT_RENDERED: AppDarkCheck = { count: null, lines: [], oldCode: 0 };

const toSourceExpression = (selectors: readonly string[]): string =>
  `(async () => {
    const appSource = ${toAppSourceBody()};
    const toSource = async (selector) => {
      let el = null;
      try { el = document.querySelector(selector); } catch { return null; }
      if (!el) return null;
      const app = await appSource(el).catch(() => null);
      const tagged = el.closest('[${SOURCE_LOC_ATTR}]')?.getAttribute('${SOURCE_LOC_ATTR}') || null;
      return app?.usedAt || app?.loc || tagged;
    };
    return Promise.all(${JSON.stringify(selectors)}.map(toSource));
  })()`;

const hasAppDarkValues = async (ctx: AppDarkContext): Promise<boolean> => {
  const folder = path.join(
    ctx.direction.workTree,
    ctx.project.app?.appDir ?? ""
  );

  const tokens = await getAppTokensIn(folder);

  return (tokens?.sheet.declarations ?? []).some(
    (entry) => entry.scope === "dark"
  );
};

const listPageItems = async (page: RenderPage): Promise<AppDarkItem[]> => {
  const misses = await listContrastMisses(page);

  const sources = await page.evaluate<(string | null)[]>(
    toSourceExpression(misses.map((miss) => miss.selector))
  );

  return misses.map((miss, index) => ({
    kind: miss.kind,
    line: null,
    need: miss.need,
    part: miss.part,
    ratio: miss.ratio,
    selector: miss.selector,
    source: sources[index] ?? null,
  }));
};

const listDarkItems = async (
  preview: PreviewService,
  url: string
): Promise<AppDarkItem[] | null> => {
  const dark = toSchemedPreview(preview, "dark");
  const timer = new AbortController();

  if (!dark.withPage) {
    return null;
  }

  try {
    const render = dark.withPage(url, DARK_VIEWPORT, listPageItems);

    return await Promise.race([
      render,
      toDelay(RENDER_TIMEOUT_MS, null, { signal: timer.signal }),
    ]);
  } catch {
    return null;
  } finally {
    timer.abort();
  }
};

const toFileGroups = (
  changed: readonly ChangedFile[],
  items: readonly AppDarkItem[]
): AppDarkFile[] => {
  const groups = new Map<string, AppDarkItem[]>();

  for (const item of items) {
    const hit = toChangedEntry(item.source, changed);

    if (hit !== null) {
      const { file } = hit.entry;

      groups.set(file, [
        ...(groups.get(file) ?? []),
        { ...item, line: hit.line },
      ]);
    }
  }

  return [...groups.entries()].map(([file, list]) => ({ file, items: list }));
};

const toRatioText = (item: AppDarkItem): string => {
  if (item.ratio === null) {
    return "";
  }

  return `, ${Math.round(item.ratio * RATIO_STEP) / RATIO_STEP}:1`;
};

const toFirstText = (group: AppDarkFile): string => {
  const [first] = group.items;

  if (!first || first.line === null) {
    return "";
  }

  return ` (first: line ${first.line}${toRatioText(first)})`;
};

const toContrastLine = (group: AppDarkFile): string => {
  const count = group.items.length;
  let head = `${count} text items in ${group.file} are`;

  if (count === 1) {
    head = `1 text item in ${group.file} is`;
  }

  return `- Dark: ${head} under AA contrast in dark${toFirstText(group)}. Use token classes such as text-foreground or dark: variants, not raw colors, then take get_screenshot with colorScheme dark.`;
};

const toRestLine = (count: number): string =>
  `- Dark: ${count} more dark lines are not shown. Take get_screenshot with colorScheme dark to see them all.`;

const toPhotoPlace = (file: string, item: AppDarkItem): string => {
  if (item.line === null) {
    return `in ${file}`;
  }

  return `in ${file} (line ${item.line})`;
};

const toGroupLines = (group: AppDarkFile): string[] => {
  const contrast = group.items.filter((item) => item.kind === "contrast");
  const photo = group.items.filter((item) => item.kind === "photo");

  const lines = photo.map((item) =>
    toPhotoLine(item, toPhotoPlace(group.file, item))
  );

  if (contrast.length > 0) {
    lines.unshift(toContrastLine({ file: group.file, items: contrast }));
  }

  return lines;
};

const listGroupLines = (groups: readonly AppDarkFile[]): string[] => {
  const all = groups.flatMap((group) => toGroupLines(group));
  const lines = all.slice(0, LISTED_LINES);

  if (all.length > LISTED_LINES) {
    lines.push(toRestLine(all.length - LISTED_LINES));
  }

  return lines;
};

const inspectAppDark = async (
  ctx: AppDarkContext,
  preview: PreviewService,
  url: string | null,
  changed: readonly ChangedFile[]
): Promise<AppDarkCheck> => {
  if (url === null || changed.length === 0) {
    return NOT_RENDERED;
  }

  if (!(await hasAppDarkValues(ctx))) {
    logInfo("[agent] app dark check: no dark values, so no dark render");

    return NOT_RENDERED;
  }

  const start = Date.now();
  const items = await listDarkItems(preview, url);

  if (items === null) {
    logInfo(`[agent] app dark check: no render of ${url}, so no dark lines`);

    return NOT_RENDERED;
  }

  logInfo(
    `[agent] app dark check: rendered ${url} in ${Date.now() - start} ms, ${items.length} items under AA`
  );

  const inFiles = items.filter(
    (item) => toChangedEntry(item.source, changed) !== null
  );

  const near = inFiles.filter(
    (item) => item.source !== null && isNearChanged(changed, item.source)
  );

  return {
    count: near.length,
    lines: listGroupLines(toFileGroups(changed, near)),
    oldCode: inFiles.length - near.length,
  };
};

export { inspectAppDark };

export type { AppDarkCheck };
