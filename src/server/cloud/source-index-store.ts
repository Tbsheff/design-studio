import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { Context, Effect, Layer } from "effect";

import { checkSourceUpload } from "./engine/check-source-upload.js";
import type { GuardResult } from "./engine/check-source-upload.js";

interface SourceBindings {
  readonly appDir: string;
  readonly sourcePath: string | null;
}

interface UploadCheck {
  readonly bindings: SourceBindings;
  readonly index: ReadonlySet<string>;
  readonly realPath: string;
  readonly sha256: string;
}

interface SourceIndexStoreApi {
  readonly buildIndex: (appDir: string) => Effect.Effect<ReadonlySet<string>>;
  readonly checkUpload: (check: UploadCheck) => Effect.Effect<GuardResult>;
}

const SKIP_DIRS = new Set([".git", "node_modules"]);

const MAX_FILE_BYTES = 5_242_880;

const MAX_FILES = 20_000;

const CONCURRENCY = 8;

const toRealPath = (target: string | null): Effect.Effect<string | null> => {
  if (target === null) {
    return Effect.succeed(null);
  }

  return Effect.tryPromise(() => realpath(target)).pipe(
    Effect.orElseSucceed(() => null)
  );
};

const readEntries = (dir: string): Effect.Effect<readonly Dirent[]> =>
  Effect.tryPromise(() => readdir(dir, { withFileTypes: true })).pipe(
    Effect.orElseSucceed(() => [])
  );

const hashFile = Effect.fn("SourceIndexStore.hashFile")(function* run(
  target: string
) {
  const info = yield* Effect.tryPromise(() => stat(target)).pipe(
    Effect.orElseSucceed(() => null)
  );

  if (info === null || info.size > MAX_FILE_BYTES) {
    return null;
  }

  const bytes = yield* Effect.tryPromise(() => readFile(target)).pipe(
    Effect.orElseSucceed(() => null)
  );

  if (bytes === null) {
    return null;
  }

  return createHash("sha256").update(bytes).digest("hex");
});

const toSubdirs = (dir: string, entries: readonly Dirent[]): string[] =>
  entries.flatMap((entry) => {
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
      return [path.join(dir, entry.name)];
    }

    return [];
  });

const toFiles = (dir: string, entries: readonly Dirent[]): string[] =>
  entries.flatMap((entry) => {
    if (entry.isFile()) {
      return [path.join(dir, entry.name)];
    }

    return [];
  });

const listFiles = Effect.fn("SourceIndexStore.listFiles")(function* run(
  root: string
) {
  const files: string[] = [];
  const queue = [root];

  while (queue.length > 0 && files.length < MAX_FILES) {
    const dir = queue.shift() ?? root;
    const entries = yield* readEntries(dir);

    queue.push(...toSubdirs(dir, entries));
    files.push(...toFiles(dir, entries));
  }

  return files.slice(0, MAX_FILES);
});

class SourceIndexStore extends Context.Service<
  SourceIndexStore,
  SourceIndexStoreApi
>()("design-studio/cloud/SourceIndexStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    SourceIndexStore,
    SourceIndexStore.of({
      buildIndex: Effect.fn("SourceIndexStore.buildIndex")(function* run(
        appDir: string
      ) {
        const files = yield* listFiles(appDir);

        const hashes = yield* Effect.all(
          files.map((file) => hashFile(file)),
          {
            concurrency: CONCURRENCY,
          }
        );

        return new Set(hashes.filter((hash) => hash !== null));
      }),
      checkUpload: Effect.fn("SourceIndexStore.checkUpload")(function* run(
        check: UploadCheck
      ) {
        const resolved = yield* toRealPath(check.realPath);
        const appRoot = yield* toRealPath(check.bindings.appDir);
        const sourceRoot = yield* toRealPath(check.bindings.sourcePath);

        const isKnownHash = check.index.has(check.sha256);

        return checkSourceUpload({
          appRoot,
          isKnownHash,
          resolved,
          sourceRoot,
        });
      }),
    })
  );
}

export { SourceIndexStore };

export type { SourceBindings, UploadCheck };
