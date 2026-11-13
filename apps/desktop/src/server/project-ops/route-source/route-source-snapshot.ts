import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";

import { Effect } from "effect";

import { writeAtomic } from "../../platform/atomic-write/index.js";
import { readTextFile } from "../../platform/local-file/index.js";
import { isInside, toSnapshotDir } from "./route-source-file.js";

const SNAPSHOT_BYTES_MAX = 2_097_152;

interface RouteFileText {
  readonly file: string;
  readonly sha: string;
  readonly text: string;
}

const toTextSha = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

const toFileTexts = Effect.fn("RouteSource.toFileTexts")(function* run(
  appWorkTree: string,
  files: readonly string[]
) {
  const texts = yield* Effect.all(
    files.map((file) => readTextFile(path.join(appWorkTree, file)))
  );

  return files.flatMap((file, index): RouteFileText[] => {
    const text = texts[index] ?? null;

    if (text === null) {
      return [];
    }

    const sha = toTextSha(text);

    return [{ file, sha, text }];
  });
});

const toByteCount = (files: readonly RouteFileText[]): number =>
  files.reduce((total, item) => total + Buffer.byteLength(item.text), 0);

const setSnapshot = Effect.fn("RouteSource.setSnapshot")(function* run(
  workTree: string,
  page: string,
  files: readonly RouteFileText[]
) {
  const folder = toSnapshotDir(workTree, page);

  yield* Effect.promise(() => rm(folder, { force: true, recursive: true }));

  if (toByteCount(files) > SNAPSHOT_BYTES_MAX) {
    return false;
  }

  const kept = files.filter((item) => isInside(folder, item.file));

  yield* Effect.all(
    kept.map((item) =>
      Effect.promise(() =>
        writeAtomic(path.join(folder, item.file), item.text, {
          cleanup: "always",
          createDir: true,
        })
      )
    )
  );

  return true;
});

export { setSnapshot, toFileTexts };

export type { RouteFileText };
