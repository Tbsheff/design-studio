import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Effect } from "effect";

import { toFolderContext } from "./engine/to-folder-context.js";

interface FolderEntry {
  readonly isFolder: boolean;
  readonly path: string;
}

const FILES_MAX = 120;
const README_NAMES = ["README.md", "readme.md", "README", "README.txt"];
const DESIGN_MD = "DESIGN.md";
const LIST_CONCURRENCY = 8;

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "target",
]);

const NO_ENTRIES: readonly Dirent[] = [];

const toSettled = <Value, Fallback>(
  task: () => Promise<Value>,
  fallback: Fallback
): Effect.Effect<Value | Fallback> =>
  Effect.tryPromise({ catch: (error) => error, try: task }).pipe(
    Effect.orElseSucceed(() => fallback)
  );

const isListed = (entry: Dirent): boolean =>
  !entry.name.startsWith(".") &&
  !SKIP_DIRS.has(entry.name) &&
  (entry.isDirectory() || entry.isFile());

const toFolderEntry = (relative: string, entry: Dirent): FolderEntry => ({
  isFolder: entry.isDirectory(),
  path: path.posix.join(relative, entry.name),
});

const listEntries = Effect.fn("ProjectOpsFolderContext.listEntries")(
  function* run(folder: string, relative: string) {
    const entries = yield* toSettled(
      () => readdir(path.join(folder, relative), { withFileTypes: true }),
      NO_ENTRIES
    );

    return entries
      .filter((entry) => isListed(entry))
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map((entry) => toFolderEntry(relative, entry));
  }
);

const NO_CHILDREN: readonly FolderEntry[] = [];

const toChildren = (
  folder: string,
  entry: FolderEntry
): Effect.Effect<readonly FolderEntry[]> => {
  if (entry.isFolder) {
    return listEntries(folder, entry.path);
  }

  return Effect.succeed(NO_CHILDREN);
};

const toLine = (entry: FolderEntry): string => {
  if (entry.isFolder) {
    return `${entry.path}/`;
  }

  return entry.path;
};

const listFolderFiles = Effect.fn("ProjectOpsFolderContext.listFolderFiles")(
  function* run(folder: string) {
    const top = yield* listEntries(folder, "");

    const nested = yield* Effect.all(
      top.map((entry) => toChildren(folder, entry)),
      { concurrency: LIST_CONCURRENCY }
    );

    const lines: string[] = [];

    for (const [index, entry] of top.entries()) {
      lines.push(toLine(entry));

      for (const child of nested[index] ?? []) {
        lines.push(toLine(child));
      }
    }

    return {
      files: lines.slice(0, FILES_MAX),
      hasMoreFiles: lines.length > FILES_MAX,
    };
  }
);

const toFileText = (file: string): Effect.Effect<string | null> =>
  toSettled(() => readFile(file, "utf-8"), null);

const getFolderText = Effect.fn("ProjectOpsFolderContext.getFolderText")(
  function* run(folder: string, names: readonly string[]) {
    const texts = yield* Effect.all(
      names.map((name) => toFileText(path.join(folder, name)))
    );

    return texts.find((text) => text !== null) ?? null;
  }
);

const getFolderDesignMd = Effect.fn(
  "ProjectOpsFolderContext.getFolderDesignMd"
)(function* run(folder: string) {
  return yield* getFolderText(folder, [DESIGN_MD]);
});

const getFolderContext = Effect.fn("ProjectOpsFolderContext.getFolderContext")(
  function* run(folder: string, name: string) {
    const [listing, readme] = yield* Effect.all(
      [listFolderFiles(folder), getFolderText(folder, README_NAMES)],
      { concurrency: "unbounded" }
    );

    return toFolderContext({ ...listing, folder, name, readme });
  }
);

export { getFolderContext, getFolderDesignMd };
