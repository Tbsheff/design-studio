import { readFile } from "node:fs/promises";
import path from "node:path";

import { FileLockFileSchema } from "@design-studio/actions/file-lock/schema";
import { Result, Schema } from "effect";

import { toDecoder } from "../decode/index.js";
import { assertSafeId } from "../errors/index.js";

const FILE_NAME = "file-locks.json";

type FileLockState = typeof FileLockFileSchema.Type;

const EMPTY_STATE: FileLockState = { locks: {} };

const decodeState = toDecoder(
  Schema.fromJsonString(FileLockFileSchema),
  "ignore"
);

const toFileLockPath = (projectDir: string): string =>
  path.join(projectDir, FILE_NAME);

const toCleanGlobs = (globs: readonly string[]): string[] => [
  ...new Set(globs.filter((glob) => glob.trim() !== "")),
];

const getFileLockState = async (file: string): Promise<FileLockState> => {
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
  const state = await getFileLockState(toFileLockPath(projectDir));

  return toCleanGlobs(state.locks[did] ?? []);
};

export { getFileLockState, getFileLocks, toCleanGlobs, toFileLockPath };

export type { FileLockState };
