import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { pageTree, scriptSources, treeAnchors } from "../links/html-anchors.js";
import { hrefTarget } from "../links/implicit-links.js";

interface PageText {
  readonly html: string;
  readonly scripts: readonly string[];
}

interface PageTexts {
  readonly pages: ReadonlyMap<string, PageText>;
}

const PAGES_MAX = 200;

const SCRIPT_FILES_MAX = 6;

const SCRIPT_BYTES_MAX = 200_000;

const PAGE_BYTES_MAX = 1_000_000;

const PAGE_FILE = /\.html?$/iu;

const SKIP_PART = /^(?:\.|node_modules$|dist$|build$)/u;

const toReadText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const isPagePath = (relative: string): boolean =>
  PAGE_FILE.test(relative) &&
  !relative.split("/").some((part) => SKIP_PART.test(part));

const ENTRIES_MAX = 4000;

interface DirEntry {
  readonly isDir: boolean;
  readonly relative: string;
}

const toDirEntries = async (
  workTree: string,
  relative: string
): Promise<DirEntry[]> => {
  try {
    const entries = await readdir(path.join(workTree, relative), {
      withFileTypes: true,
    });

    return entries.flatMap((entry) => {
      if (SKIP_PART.test(entry.name)) {
        return [];
      }

      const child = [relative, entry.name].filter(Boolean).join("/");

      return [{ isDir: entry.isDirectory(), relative: child }];
    });
  } catch {
    return [];
  }
};

const toLevelPages = async (
  workTree: string,
  dirs: readonly string[],
  seen: number
): Promise<string[]> => {
  if (dirs.length === 0 || seen >= ENTRIES_MAX) {
    return [];
  }

  const level = await Promise.all(
    dirs.map((dir) => toDirEntries(workTree, dir))
  );

  const entries = level.flat().slice(0, ENTRIES_MAX - seen);

  const nextDirs = entries.flatMap(
    (entry) => (entry.isDir && [entry.relative]) || []
  );

  const pages = entries.flatMap(
    (entry) =>
      (!entry.isDir && isPagePath(entry.relative) && [entry.relative]) || []
  );

  const deeper = await toLevelPages(workTree, nextDirs, seen + entries.length);

  return [...pages, ...deeper];
};

const toPagePaths = async (workTree: string): Promise<string[]> => {
  const pages = await toLevelPages(workTree, [""], 0);

  return pages.toSorted().slice(0, PAGES_MAX);
};

const toScriptFile = (
  workTree: string,
  pageFile: string,
  source: string
): string | null => {
  const clean = source.split(/[?#]/u)[0] ?? "";
  const root = path.resolve(workTree) + path.sep;
  let full = path.resolve(path.dirname(pageFile), clean);

  if (clean.startsWith("/")) {
    full = path.resolve(workTree, `.${clean}`);
  }

  if (!full.startsWith(root)) {
    return null;
  }

  return full;
};

const toLocalScripts = async (
  workTree: string,
  pageFile: string,
  sources: readonly string[]
): Promise<string[]> => {
  const files: string[] = [];

  for (const source of sources.slice(0, SCRIPT_FILES_MAX)) {
    const file = toScriptFile(workTree, pageFile, source);

    if (file !== null) {
      files.push(file);
    }
  }

  const texts = await Promise.all(files.map((file) => toReadText(file)));

  return texts.filter(
    (text): text is string => text !== null && text.length <= SCRIPT_BYTES_MAX
  );
};

const toPageText = async (
  workTree: string,
  relative: string
): Promise<PageText | null> => {
  const file = path.join(workTree, ...relative.split("/"));
  const html = await toReadText(file);

  if (html === null || html.length > PAGE_BYTES_MAX) {
    return null;
  }

  const scripts = await toLocalScripts(
    workTree,
    file,
    scriptSources(pageTree(html))
  );

  return { html, scripts };
};

const toPageTexts = async (workTree: string): Promise<PageTexts> => {
  const paths = await toPagePaths(workTree);

  const texts = await Promise.all(
    paths.map((relative) => toPageText(workTree, relative))
  );

  const pages = new Map<string, PageText>();

  for (const [index, relative] of paths.entries()) {
    const text = texts[index] ?? null;

    if (text !== null) {
      pages.set(relative, text);
    }
  }

  return { pages };
};

const toTargetPage = (
  pages: ReadonlyMap<string, PageText>,
  target: string
): string | null => {
  let clean = target;

  while (clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }

  const options = [target, `${clean}.html`, `${clean}/index.html`];

  if (clean === "") {
    options.push("index.html");
  }

  return options.find((option) => pages.has(option)) ?? null;
};

const toTargets = (
  pages: ReadonlyMap<string, PageText>,
  page: string,
  text: PageText
): string[] => {
  const anchors = treeAnchors(pageTree(text.html), [...text.scripts]);
  const targets = new Set<string>();

  for (const anchor of anchors) {
    const target = hrefTarget(page, anchor.href);
    let found: string | null = null;

    if (target !== null) {
      found = toTargetPage(pages, target);
    }

    if (found !== null && found !== page) {
      targets.add(found);
    }
  }

  return [...targets];
};

const toPageLinks = (texts: PageTexts): Map<string, readonly string[]> => {
  const links = new Map<string, readonly string[]>();

  for (const [page, text] of texts.pages) {
    links.set(page, toTargets(texts.pages, page, text));
  }

  return links;
};

export { toPageLinks, toPageTexts };

export type { PageText, PageTexts };
