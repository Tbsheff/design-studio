import { readFile } from "node:fs/promises";
import path from "node:path";

import { directEditRuntimeOf, getComponentsMd } from "./deps.js";
import type { Project } from "./deps.js";
import { toMarkupDrift, toPackRecipes } from "./engine/index.js";
import type { MarkupDrift } from "./engine/index.js";
import { KitDriftError } from "./errors.js";
import { listPageFiles } from "./source-files.js";

const COMPONENTS_FILE = "design-system/components.md";
const MAIN_DIRECTION = "main";
const PAGE_PATTERN = /\.html?$/u;
const LINK_PATTERN = /<link\b[^>]*>/giu;
const STYLESHEET_PATTERN = /\brel\s*=\s*["']?stylesheet\b/iu;
const HREF_PATTERN = /\bhref\s*=\s*["']?(?<href>[^"'\s>]+)/iu;
const REMOTE_PATTERN = /^(?:[a-z]+:|\/\/)/iu;
const MAX_SHEETS = 8;

const isKitPrototype = (project: Project): boolean =>
  (project.appProjectId ?? "") !== "" && !project.app;

const getText = async (absolute: string): Promise<string | null> => {
  try {
    return await readFile(absolute, "utf-8");
  } catch {
    return null;
  }
};

const toRelative = (root: string, absolute: string): string =>
  path.relative(root, absolute).split(path.sep).join("/");

const toPagePath = (workTree: string, page: string): string => {
  const absolute = path.resolve(workTree, page);

  if (!absolute.startsWith(workTree + path.sep) || !PAGE_PATTERN.test(page)) {
    throw new KitDriftError(
      `The page ${page} is not an HTML page of this prototype.`
    );
  }

  return absolute;
};

const toSheetPath = (
  workTree: string,
  absolute: string,
  href: string
): string => {
  const clean = href.split(/[?#]/u)[0] ?? "";

  if (clean.startsWith("/")) {
    return path.join(workTree, clean);
  }

  return path.resolve(path.dirname(absolute), clean);
};

const listSheetPaths = (
  workTree: string,
  absolute: string,
  html: string
): string[] => {
  const found: string[] = [];

  for (const match of html.matchAll(LINK_PATTERN)) {
    const href = HREF_PATTERN.exec(match[0])?.groups?.href ?? "";
    const isLocal = href !== "" && !REMOTE_PATTERN.test(href);
    const sheet = toSheetPath(workTree, absolute, href);

    if (
      STYLESHEET_PATTERN.test(match[0]) &&
      isLocal &&
      sheet.startsWith(workTree + path.sep)
    ) {
      found.push(sheet);
    }
  }

  return found.slice(0, MAX_SHEETS);
};

const getPageCss = async (
  workTree: string,
  absolute: string,
  html: string
): Promise<string> => {
  const sheets = await Promise.all(
    listSheetPaths(workTree, absolute, html).map(
      async (sheet) => (await getText(sheet)) ?? ""
    )
  );

  return sheets.join("\n");
};

const listTargets = async (
  workTree: string,
  page: string | null
): Promise<string[]> => {
  if (page !== null) {
    return [toPagePath(workTree, page)];
  }

  return await listPageFiles(workTree);
};

const getAppTree = async (appProjectId: string): Promise<string | null> => {
  const runtime = directEditRuntimeOf();

  if (runtime === null || appProjectId === "") {
    return null;
  }

  try {
    const app = await runtime.loadDirection(appProjectId, MAIN_DIRECTION);

    return app.direction.workTree;
  } catch {
    return null;
  }
};

const getRecipeText = async (
  project: Project,
  workTree: string
): Promise<string> => {
  const packed = await getText(path.join(workTree, COMPONENTS_FILE));

  if (packed !== null) {
    return packed;
  }

  const appTree = await getAppTree(project.appProjectId ?? "");

  if (appTree === null) {
    return "";
  }

  return (await getComponentsMd(appTree)) ?? "";
};

const listPrototypeDrift = async (
  project: Project,
  workTree: string,
  page: string | null
): Promise<MarkupDrift[]> => {
  const recipes = toPackRecipes(await getRecipeText(project, workTree));
  const targets = await listTargets(workTree, page);

  if (recipes.length === 0) {
    return [];
  }

  const scanned = await Promise.all(
    targets.map(async (absolute) => {
      const html = await getText(absolute);

      if (html === null && page !== null) {
        throw new KitDriftError(
          `The page ${page} is not an HTML page of this prototype.`
        );
      }

      return toMarkupDrift({
        css: await getPageCss(workTree, absolute, html ?? ""),
        file: toRelative(workTree, absolute),
        html: html ?? "",
        recipes,
      });
    })
  );

  return scanned.flat();
};

export { isKitPrototype, listPrototypeDrift };
