import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { Font } from "@design-studio/actions/font/schema";
import type { Effect } from "effect";

import {
  harvestNextFonts,
  readDesignSystemState,
  runDirectionRead,
  toDirectEditStatusFailure,
} from "./deps.js";
import type { BoundedCache, DirectionRun, KnownFailure } from "./deps.js";
import { toFontRows } from "./engine/to-font-rows.js";
import type {
  FontText,
  FontToken,
  NamedFamily,
} from "./engine/to-font-rows.js";

interface ListFontCommand {
  readonly cursor: string | null;
  readonly directionId: string;
  readonly limit: number;
  readonly projectId: string;
}

interface FontPage {
  readonly items: readonly Font[];
  readonly next: string | null;
}

interface CachedFonts {
  readonly key: string;
  readonly rows: readonly Font[];
}

interface FoundFile {
  readonly absolute: string;
  readonly isText: boolean;
  readonly stamp: string;
}

type FontCache = BoundedCache<string, CachedFonts>;

const SKIPPED_DIRS: ReadonlySet<string> = new Set([
  ".git",
  ".next",
  ".studio",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

const TEXT_PATTERN = /\.(?:css|html)$/u;

const KEY_PATTERN =
  /^(?:layout|_app)\.[jt]sx?$|^(?:pack|tokens|package)\.json$/u;

const MAX_FILES = 5000;

const MAX_BYTES = 524_288;

const FONT_TOKEN = /^--font-/u;

const NEXT_LAYOUT = /(?:^|\/)(?:src\/)?app\/layout\.[jt]sx?$/u;

const listEntries = async (folder: string): Promise<Dirent[]> => {
  try {
    return await readdir(folder, { withFileTypes: true });
  } catch {
    return [];
  }
};

const toFoundFile = async (
  absolute: string,
  isText: boolean
): Promise<FoundFile[]> => {
  try {
    const info = await stat(absolute);

    return [{ absolute, isText, stamp: `${info.mtimeMs}:${info.size}` }];
  } catch {
    return [];
  }
};

const listFolder = async (folder: string): Promise<FoundFile[]> => {
  const entries = await listEntries(folder);

  const nested = await Promise.all(
    entries.map(async (entry): Promise<FoundFile[]> => {
      const absolute = path.join(folder, entry.name);

      if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) {
        return await listFolder(absolute);
      }

      if (entry.isFile() && TEXT_PATTERN.test(entry.name)) {
        return await toFoundFile(absolute, true);
      }

      if (entry.isFile() && KEY_PATTERN.test(entry.name)) {
        return await toFoundFile(absolute, false);
      }

      return [];
    })
  );

  return nested.flat();
};

const toCacheKey = (files: readonly FoundFile[]): string =>
  files.map((file) => `${file.absolute}=${file.stamp}`).join("\n");

const toFileText = async (
  root: string,
  file: FoundFile
): Promise<FontText[]> => {
  try {
    const info = await stat(file.absolute);

    if (info.size > MAX_BYTES) {
      return [];
    }

    const text = await readFile(file.absolute, "utf-8");

    return [{ file: path.relative(root, file.absolute), text }];
  } catch {
    return [];
  }
};

const toFirstFamily = (value: string): string =>
  (value.split(",")[0] ?? "").replaceAll(/["']/gu, "").trim();

const toNextFamilies = async (root: string): Promise<NamedFamily[]> => {
  const fonts = await harvestNextFonts(root);

  return fonts.candidates.map((candidate) => ({
    family: toFirstFamily(candidate.value ?? ""),
    source: "next-font",
  }));
};

const toStateParts = async (
  run: DirectionRun
): Promise<{
  readonly families: NamedFamily[];
  readonly texts: FontText[];
  readonly tokens: FontToken[];
}> => {
  const state = await readDesignSystemState(run.project, run.direction);

  const tokens = state.entries.flatMap((entry) => {
    if (FONT_TOKEN.test(entry.cssVar)) {
      return [{ name: entry.cssVar, value: entry.value }];
    }

    return [];
  });

  const fonts = state.manifest?.fonts ?? null;

  if (fonts === null) {
    return { families: [], texts: [], tokens };
  }

  const families = [fonts.display, fonts.body, fonts.mono]
    .map((value) => toFirstFamily(value))
    .map((family): NamedFamily => ({ family, source: "pack" }));

  const texts = [{ file: "pack.json", text: fonts.googleFontsUrl ?? "" }];

  return { families, texts, tokens };
};

const isAppProject = (run: DirectionRun): boolean =>
  (run.project.app ?? null) !== null || run.project.folder?.kind === "app";

const isHtmlPrototype = (
  run: DirectionRun,
  next: readonly NamedFamily[]
): boolean =>
  run.project.kind === "html" && !isAppProject(run) && next.length === 0;

const hasNextLayout = (root: string, files: readonly FoundFile[]): boolean =>
  files.some((file) =>
    NEXT_LAYOUT.test(
      path.relative(root, file.absolute).split(path.sep).join("/")
    )
  );

const isCatalogShown = (
  run: DirectionRun,
  next: readonly NamedFamily[],
  files: readonly FoundFile[]
): boolean =>
  isHtmlPrototype(run, next) || hasNextLayout(run.direction.workTree, files);

const toRows = async (
  run: DirectionRun,
  files: readonly FoundFile[]
): Promise<readonly Font[]> => {
  const root = run.direction.workTree;

  const [next, state, read] = await Promise.all([
    toNextFamilies(root),
    toStateParts(run),
    Promise.all(
      files.flatMap((file) => {
        if (file.isText) {
          return [toFileText(root, file)];
        }

        return [];
      })
    ),
  ]);

  return toFontRows({
    families: [...next, ...state.families],
    isHtmlPrototype: isCatalogShown(run, next, files),
    texts: [...read.flat(), ...state.texts],
    tokens: state.tokens,
  });
};

const toOffset = (cursor: string | null): number => {
  const offset = Number(cursor ?? "0");

  if (Number.isInteger(offset) && offset >= 0) {
    return offset;
  }

  return 0;
};

const toPage = (rows: readonly Font[], command: ListFontCommand): FontPage => {
  const offset = toOffset(command.cursor);

  const end = offset + command.limit;

  let next: string | null = null;

  if (end < rows.length) {
    next = String(end);
  }

  return { items: rows.slice(offset, end), next };
};

const runList = async (
  cache: FontCache,
  run: DirectionRun,
  command: ListFontCommand
): Promise<FontPage> => {
  const root = run.direction.workTree;

  const found = await listFolder(root);

  const files = found
    .toSorted((left, right) => left.absolute.localeCompare(right.absolute))
    .slice(0, MAX_FILES);

  const key = toCacheKey(files);

  const known = cache.get(root);

  if (known?.key === key) {
    return toPage(known.rows, command);
  }

  const rows = await toRows(run, files);

  cache.set(root, { key, rows });

  return toPage(rows, command);
};

const runFontList = (
  cache: FontCache,
  command: ListFontCommand
): Effect.Effect<FontPage, KnownFailure> =>
  runDirectionRead(
    { directionId: command.directionId, projectId: command.projectId },
    (run) => runList(cache, run, command),
    toDirectEditStatusFailure
  );

export { runFontList };

export type { CachedFonts, FontCache, FontPage, ListFontCommand };
