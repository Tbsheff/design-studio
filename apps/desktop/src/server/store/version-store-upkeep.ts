import type { Stats } from "node:fs";
import { lstat, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Project } from "@design-studio/contracts";

import { ConflictError } from "../platform/errors/index.js";
import { runGit } from "../platform/git/index.js";
import type { GitScope } from "../platform/git/index.js";
import { toRepoExcludeLines } from "./version-external.js";

interface StoreReport {
  readonly alternates: readonly string[];
  readonly localBytes: number;
  readonly measuredAt: number;
}

const REPORT_FILE = "studio-store.json";
const FANOUT_PATTERN = /^[0-9a-f]{2}$/u;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const ZERO_SHA_PATTERN = /^0{40}$/u;
const GITLINK_MODE = "160000";
const MODE_FIELD = 1;
const TARGET_SHA_FIELD = 3;

const MISSING_OBJECT_PATTERN =
  /unable to read|invalid object|bad object|not a valid object|missing (?:blob|tree)|(?:blob|tree) [0-9a-f]{40} not found|is corrupt/iu;

const MISSING_OBJECT_TEXT =
  "This version needs file data that is no longer in the git repo of the folder. A git gc or repack in that repo removed it. You cannot restore this version. Other versions can still restore.";

const toStats = async (target: string): Promise<Stats | null> => {
  try {
    return await lstat(target);
  } catch {
    return null;
  }
};

const toText = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const toEntries = async (
  dir: string,
  isRecursive: boolean
): Promise<string[]> => {
  try {
    return await readdir(dir, { recursive: isRecursive });
  } catch {
    return [];
  }
};

const deleteIfStale = async (target: string): Promise<void> => {
  const info = await toStats(target);

  if (info !== null && info.isFile() && info.mtimeMs < performance.timeOrigin) {
    await rm(target, { force: true });
  }
};

const toLockFiles = async (gitDir: string): Promise<string[]> => {
  const [top, refs] = await Promise.all([
    toEntries(gitDir, false),
    toEntries(path.join(gitDir, "refs"), true),
  ]);

  return [...top, ...refs.map((entry) => path.join("refs", entry))].flatMap(
    (entry) => {
      if (!entry.endsWith(".lock")) {
        return [];
      }

      return [path.join(gitDir, entry)];
    }
  );
};

const toTempFiles = async (dir: string): Promise<string[]> => {
  const names = await toEntries(dir, false);

  return names.flatMap((name) => {
    if (!name.startsWith("tmp_")) {
      return [];
    }

    return [path.join(dir, name)];
  });
};

const toGarbageFiles = async (gitDir: string): Promise<string[]> => {
  const objectsDir = path.join(gitDir, "objects");
  const names = await toEntries(objectsDir, false);

  const dirs = [
    path.join(objectsDir, "pack"),
    ...names.flatMap((name) => {
      if (!FANOUT_PATTERN.test(name)) {
        return [];
      }

      return [path.join(objectsDir, name)];
    }),
  ];

  const found = await Promise.all(dirs.map((dir) => toTempFiles(dir)));

  return found.flat();
};

const deleteStaleFiles = async (gitDir: string): Promise<void> => {
  const [locks, garbage] = await Promise.all([
    toLockFiles(gitDir),
    toGarbageFiles(gitDir),
  ]);

  await Promise.all(
    [...locks, ...garbage].map((target) => deleteIfStale(target))
  );
};

const toExternalExcludes = async (
  project: Project,
  base: readonly string[]
): Promise<string[]> => {
  const workTree = project.directions[0]?.workTree ?? null;

  if (workTree === null) {
    return [...base];
  }

  const text = await toText(path.join(workTree, ".git", "info", "exclude"));

  const lines = text.split("\n").flatMap((line) => {
    const trimmed = line.trimEnd();

    if (trimmed === "" || trimmed.startsWith("#")) {
      return [];
    }

    return [trimmed];
  });

  return [...base, ...toRepoExcludeLines(project, lines)];
};

const toTreeBytes = async (dir: string): Promise<number> => {
  const names = await toEntries(dir, false);

  const sizes = await Promise.all(
    names.map(async (name) => {
      const target = path.join(dir, name);
      const info = await toStats(target);

      if (info === null) {
        return 0;
      }

      if (info.isDirectory()) {
        return toTreeBytes(target);
      }

      return info.size;
    })
  );

  return sizes.reduce((sum, size) => sum + size, 0);
};

const toStoreReport = async (gitDir: string): Promise<StoreReport> => {
  const objectsDir = path.join(gitDir, "objects");
  const text = await toText(path.join(objectsDir, "info", "alternates"));

  return {
    alternates: text.split("\n").filter((line) => line !== ""),
    localBytes: await toTreeBytes(objectsDir),
    measuredAt: Date.now(),
  };
};

const updateStoreReport = async (gitDir: string): Promise<StoreReport> => {
  const report = await toStoreReport(gitDir);
  await writeFile(
    path.join(gitDir, REPORT_FILE),
    `${JSON.stringify(report)}\n`
  );

  return report;
};

const toBlobSha = (field: string): string[] => {
  const parts = field.split(" ");
  const sha = parts[TARGET_SHA_FIELD] ?? "";

  if (
    !field.startsWith(":") ||
    parts[MODE_FIELD] === GITLINK_MODE ||
    !SHA_PATTERN.test(sha) ||
    ZERO_SHA_PATTERN.test(sha)
  ) {
    return [];
  }

  return [sha];
};

const toChangedBlobs = async (
  scope: GitScope,
  fromTree: string,
  toTree: string
): Promise<string[] | null> => {
  try {
    const { stdout } = await runGit(scope, [
      "diff-tree",
      "-r",
      "-z",
      "--no-renames",
      fromTree,
      toTree,
    ]);

    return stdout.split("\0").flatMap((field) => toBlobSha(field));
  } catch {
    return null;
  }
};

const hasRestoreObjects = async (
  scope: GitScope,
  fromTree: string,
  toTree: string
): Promise<boolean> => {
  const shas = await toChangedBlobs(scope, fromTree, toTree);

  if (shas === null) {
    return false;
  }

  if (shas.length === 0) {
    return true;
  }

  const { stdout } = await runGit(scope, ["cat-file", "--batch-check"], {
    input: `${shas.join("\n")}\n`,
  });

  return !stdout.split("\n").some((line) => line.endsWith(" missing"));
};

const toMissingObjectError = (): ConflictError =>
  new ConflictError(MISSING_OBJECT_TEXT);

const toRestorableTree = async (
  scope: GitScope,
  fromTree: string,
  toTree: string
): Promise<string> => {
  if (!(await hasRestoreObjects(scope, fromTree, toTree))) {
    throw toMissingObjectError();
  }

  return toTree;
};

const toRestoreError = (error: Error): Error => {
  if (MISSING_OBJECT_PATTERN.test(error.message)) {
    return toMissingObjectError();
  }

  return error;
};

export {
  deleteStaleFiles,
  toExternalExcludes,
  toRestorableTree,
  toRestoreError,
  toStoreReport,
  updateStoreReport,
};

export type { StoreReport };
