import { access } from "node:fs/promises";
import path from "node:path";

import type { Project } from "@design-studio/contracts";

import { loadLibrary } from "../../components/index.js";
import type { LibraryEntry } from "../../components/index.js";
import { getPackageName } from "./chart-recharts.js";

interface ChartKit {
  readonly absolute: string;
  readonly entry: LibraryEntry;
  readonly importPath: string;
  readonly packageDir: string | null;
}

const KIT_EXPORTS = [
  "ChartContainer",
  "ChartTooltip",
  "ChartTooltipContent",
  "ChartLegend",
  "ChartLegendContent",
] as const;

const SOURCE_EXTENSION = /\.(?:tsx|jsx|ts|js)$/u;

const CHART_FILE = /\/chart\.[jt]sx$/u;

const isFile = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const inspectPackageDir = async (
  root: string,
  dir: string
): Promise<string | null> => {
  if (!dir.startsWith(root) || dir === root) {
    return null;
  }

  if (await isFile(path.join(dir, "package.json"))) {
    return dir;
  }

  return inspectPackageDir(root, path.dirname(dir));
};

const hasKitExports = (text: string): boolean =>
  KIT_EXPORTS.every((name) => new RegExp(`\\b${name}\\b`, "u").test(text));

const toCommonSpecifier = (specifiers: readonly string[]): string | null => {
  const counts = new Map<string, number>();

  for (const specifier of specifiers) {
    counts.set(specifier, (counts.get(specifier) ?? 0) + 1);
  }

  const ranked = [...counts].toSorted((left, right) => right[1] - left[1]);

  const top = ranked.at(0);

  if (top) {
    return top[0];
  }

  return null;
};

const toGuessedPath = async (
  root: string,
  file: string,
  packageDir: string | null
): Promise<string> => {
  const bare = file.replace(SOURCE_EXTENSION, "");

  if (packageDir !== null) {
    const name = await getPackageName(packageDir);
    const inside = path.relative(packageDir, bare).split(path.sep);

    if (name !== null) {
      return [name, ...inside.filter((part) => part !== "src")].join("/");
    }
  }

  const relative = path.relative(root, bare).split(path.sep).join("/");

  if (relative.startsWith("src/")) {
    return `@/${relative.slice("src/".length)}`;
  }

  return relative;
};

const inspectChartKit = async (
  project: Project,
  workTree: string
): Promise<ChartKit | null> => {
  if (project.kind !== "react") {
    return null;
  }

  const library = await loadLibrary(project, workTree);

  const candidates = library.entries.filter(
    (item) =>
      item.name === "ChartContainer" &&
      hasKitExports(library.texts.get(item.absolute) ?? "")
  );

  const chosen =
    candidates.find((item) => CHART_FILE.test(item.file)) ?? candidates.at(0);

  if (!chosen) {
    return null;
  }

  const dir = await inspectPackageDir(
    library.root,
    path.dirname(chosen.absolute)
  );

  const used = library.imports.get("ChartContainer");

  const usedPath = toCommonSpecifier(
    [...(used?.values() ?? [])].filter((item) => !item.startsWith("."))
  );

  const guessed = await toGuessedPath(library.root, chosen.absolute, dir);

  return {
    absolute: chosen.absolute,
    entry: chosen,
    importPath: usedPath ?? guessed,
    packageDir: dir,
  };
};

export { KIT_EXPORTS, inspectChartKit };

export type { ChartKit };
