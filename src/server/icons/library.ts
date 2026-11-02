import { access } from "node:fs/promises";
import path from "node:path";

import { coreSet } from "./core.js";
import { ICON_BUNDLED, ICON_PACKAGES } from "./deps.js";
import type { IconPackage, IconSource, Project } from "./deps.js";
import { PACKAGE_SETS } from "./packages.js";
import { IconError } from "./set.js";
import type { IconSet } from "./set.js";

interface IconScope {
  project: Pick<Project, "app" | "kind">;
  workTree: string;
}

interface FoundPackage {
  name: IconPackage;
  root: string;
}

const present = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const inside = (dir: string, top: string): boolean => {
  const relative = path.relative(top, dir);

  return !relative.startsWith("..") && !path.isAbsolute(relative);
};

const searchDirs = (start: string, root: string): string[] => {
  const top = path.resolve(root);
  const from = path.resolve(start);

  if (!inside(from, top)) {
    return [top];
  }

  const parts = path.relative(top, from).split(path.sep).filter(Boolean);

  const below = parts.map((_part, index) =>
    path.join(top, ...parts.slice(0, parts.length - index))
  );

  return [...below, top];
};

const candidates = (
  dirs: readonly string[],
  wanted: readonly IconPackage[]
): FoundPackage[] =>
  dirs.flatMap((dir) =>
    wanted.map((name) => ({
      name,
      root: path.join(dir, "node_modules", ...name.split("/")),
    }))
  );

const findPackage = async (
  dirs: readonly string[],
  wanted: readonly IconPackage[]
): Promise<FoundPackage | null> => {
  const all = candidates(dirs, wanted);

  const found = await Promise.all(
    all.map((item) => present(path.join(item.root, "package.json")))
  );

  return all.find((_item, index) => found[index]) ?? null;
};

const appRoot = (scope: IconScope): string => {
  const appDir = scope.project.app?.appDir;

  if (!appDir) {
    return scope.workTree;
  }

  return path.join(scope.workTree, appDir);
};

const usesJsx = (scope: IconScope): boolean =>
  scope.project.kind === "react" || Boolean(scope.project.app);

const missing = (library: IconSource): IconError =>
  new IconError(
    `${library} is not installed in this project. Leave out library to use the bundled lucide set as inline SVG.`
  );

const iconSetFor = async (
  scope: IconScope,
  from: string,
  library: IconSource | null
): Promise<IconSet> => {
  if (library === ICON_BUNDLED || !usesJsx(scope)) {
    return coreSet;
  }

  const wanted = ICON_PACKAGES.filter((name) => !library || name === library);
  const found = await findPackage(searchDirs(from, scope.workTree), wanted);

  if (found) {
    return PACKAGE_SETS[found.name](found.root);
  }

  if (library) {
    throw missing(library);
  }

  return coreSet;
};

export { appRoot, iconSetFor, searchDirs, usesJsx };

export type { IconScope };
