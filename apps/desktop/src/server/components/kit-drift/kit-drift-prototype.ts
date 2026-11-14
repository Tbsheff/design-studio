import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Project } from "./deps.js";
import { toMarkupDrift, toPackRecipes } from "./engine/index.js";
import type { MarkupDrift } from "./engine/index.js";
import { KitDriftError } from "./errors.js";
import { listPageFiles } from "./source-files.js";

const COMPONENTS_FILE = "design-system/components.md";
const PAGE_PATTERN = /\.html?$/u;

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

const listTargets = async (
  workTree: string,
  page: string | null
): Promise<string[]> => {
  if (page !== null) {
    return [toPagePath(workTree, page)];
  }

  return await listPageFiles(workTree);
};

const listPrototypeDrift = async (
  workTree: string,
  page: string | null
): Promise<MarkupDrift[]> => {
  const markdown = await getText(path.join(workTree, COMPONENTS_FILE));
  const recipes = toPackRecipes(markdown ?? "");
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
        file: toRelative(workTree, absolute),
        html: html ?? "",
        recipes,
      });
    })
  );

  return scanned.flat();
};

export { isKitPrototype, listPrototypeDrift };
