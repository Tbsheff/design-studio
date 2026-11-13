import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { toComponentRecipes } from "../engine/to-component-recipes.js";
import { toComponentsMd } from "../engine/to-components-md.js";
import type { ComponentFile } from "../engine/to-components-md.js";

const KIT_DIRS = [
  "packages/ui/src/components",
  "src/components/ui",
  "components/ui",
];

const PACKAGES_DIR = "packages";
const PACKAGE_KIT_DIR = "src/components/ui";
const FIRST_FILES = ["button", "card", "badge", "input"];
const KIT_FILE = /^[\w-]+\.[jt]sx$/u;
const SKIPPED_FILE = /\.(?:test|spec|stories)\.[jt]sx$/u;
const MAX_FILES = 24;
const MAX_PACKAGES = 40;
const MAX_FILE_BYTES = 65_536;

const toRealPath = async (target: string): Promise<string | null> => {
  try {
    return await realpath(target);
  } catch {
    return null;
  }
};

const isInside = (root: string, target: string): boolean =>
  target === root || target.startsWith(`${root}${path.sep}`);

const listNames = async (dir: string): Promise<string[]> => {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
};

const listKitDirs = async (root: string): Promise<string[]> => {
  const names = await listNames(path.join(root, PACKAGES_DIR));

  const packages = names
    .slice(0, MAX_PACKAGES)
    .map((name) => path.join(PACKAGES_DIR, name, PACKAGE_KIT_DIR));

  const found = await Promise.all(
    [...KIT_DIRS, ...packages].map(async (dir) => {
      const real = await toRealPath(path.join(root, dir));

      if (real === null || !isInside(root, real)) {
        return [];
      }

      return [dir];
    })
  );

  return found.flat();
};

const toRank = (file: string): number => {
  const rank = FIRST_FILES.indexOf(path.basename(file).split(".")[0] ?? "");

  if (rank === -1) {
    return FIRST_FILES.length;
  }

  return rank;
};

const listKitFiles = async (root: string): Promise<string[]> => {
  const dirs = await listKitDirs(root);

  const files = await Promise.all(
    dirs.map(async (dir) => {
      const names = await listNames(path.join(root, dir));

      return names.flatMap((name) => {
        if (!KIT_FILE.test(name) || SKIPPED_FILE.test(name)) {
          return [];
        }

        return [path.posix.join(dir, name)];
      });
    })
  );

  return files
    .flat()
    .toSorted((left, right) => toRank(left) - toRank(right))
    .slice(0, MAX_FILES);
};

const getKitSource = async (
  root: string,
  file: string
): Promise<string | null> => {
  const real = await toRealPath(path.join(root, file));

  if (real === null || !isInside(root, real)) {
    return null;
  }

  try {
    const info = await stat(real);

    if (!info.isFile() || info.size > MAX_FILE_BYTES) {
      return null;
    }

    return await readFile(real, "utf-8");
  } catch {
    return null;
  }
};

const toComponentFile = async (
  root: string,
  file: string
): Promise<ComponentFile[]> => {
  const source = await getKitSource(root, file);

  if (source === null) {
    return [];
  }

  const components = toComponentRecipes(source);

  if (components.length === 0) {
    return [];
  }

  return [{ components, file }];
};

const getComponentsMd = async (folderPath: string): Promise<string | null> => {
  const root = await toRealPath(folderPath);

  if (root === null) {
    return null;
  }

  const files = await listKitFiles(root);

  const parsed = await Promise.all(
    files.map((file) => toComponentFile(root, file))
  );

  if (parsed.flat().length === 0) {
    return null;
  }

  return toComponentsMd(parsed.flat(), path.basename(root));
};

export { getComponentsMd };
