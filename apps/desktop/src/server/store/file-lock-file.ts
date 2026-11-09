import { readFile } from "node:fs/promises";
import path from "node:path";

import { FileLockFileSchema } from "@design-studio/actions/file-lock/schema";
import { Result, Schema } from "effect";

import { writeAtomic } from "../platform/atomic-write/index.js";
import { toDecoder } from "../platform/decode/index.js";
import { assertSafeId } from "../platform/errors/index.js";
import { createKeyedMutex } from "../platform/mutex/index.js";

const FILE_NAME = "file-locks.json";

type FileLockState = typeof FileLockFileSchema.Type;

const EMPTY_STATE: FileLockState = { locks: {} };

const decodeState = toDecoder(
  Schema.fromJsonString(FileLockFileSchema),
  "ignore"
);

const mutex = createKeyedMutex();

const toFileLockPath = (projectDir: string): string =>
  path.join(projectDir, FILE_NAME);

const toCleanGlobs = (globs: readonly string[]): string[] => [
  ...new Set(globs.filter((glob) => glob.trim() !== "")),
];

const getState = async (file: string): Promise<FileLockState> => {
  try {
    const text = await readFile(file, "utf-8");

    return Result.getOrElse(decodeState(text), () => EMPTY_STATE);
  } catch {
    return EMPTY_STATE;
  }
};

const getFileLocks = async (
  projectDir: string,
  directionId: string
): Promise<string[]> => {
  const did = assertSafeId(directionId, "directionId");
  const state = await getState(toFileLockPath(projectDir));

  return toCleanGlobs(state.locks[did] ?? []);
};

const setFileLocks = (
  projectDir: string,
  directionId: string,
  globs: readonly string[]
): Promise<string[]> =>
  mutex(projectDir, async (): Promise<string[]> => {
    const did = assertSafeId(directionId, "directionId");
    const file = toFileLockPath(projectDir);
    const state = await getState(file);
    const clean = toCleanGlobs(globs);
    const kept = Object.entries(state.locks).filter(([key]) => key !== did);
    const own: [string, string[]][] = [];

    if (clean.length > 0) {
      own.push([did, clean]);
    }

    const locks = Object.fromEntries([...kept, ...own]);

    await writeAtomic(file, `${JSON.stringify({ locks }, null, 2)}\n`, {
      cleanup: "always",
      createDir: true,
    });

    return clean;
  });

export { getFileLocks, setFileLocks, toFileLockPath };
