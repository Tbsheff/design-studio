import { chmod, copyFile, readFile, readdir, stat } from "node:fs/promises";

import { Effect, Schema } from "effect";

interface FileStamp {
  readonly mtimeMs: number;
  readonly size: number;
}

const toNullIfMissing = <Value>(
  task: () => Promise<Value>
): Effect.Effect<Value | null> =>
  Effect.tryPromise({ catch: (error) => error, try: task }).pipe(
    Effect.catchIf(
      (error) =>
        error instanceof Error && "code" in error && error.code === "ENOENT",
      () => Effect.succeed(null)
    ),
    Effect.orDie
  );

const toFileStamp = Effect.fn("LocalFile.toFileStamp")(function* run(
  file: string
) {
  const found = yield* toNullIfMissing(() => stat(file));

  if (found === null) {
    return null;
  }

  return { mtimeMs: found.mtimeMs, size: found.size };
});

const hasFile = Effect.fn("LocalFile.hasFile")(function* run(file: string) {
  return (yield* toFileStamp(file)) !== null;
});

const listEntries = Effect.fn("LocalFile.listEntries")(function* run(
  folder: string,
  isFolder: boolean
) {
  const entries = yield* toNullIfMissing(() =>
    readdir(folder, { withFileTypes: true })
  );

  return (entries ?? [])
    .flatMap((entry) => {
      if (entry.isDirectory() === isFolder) {
        return [entry.name];
      }

      return [];
    })
    .toSorted();
});

const listFolderNames = (folder: string): Effect.Effect<string[]> =>
  listEntries(folder, true);

const listFileNames = (folder: string): Effect.Effect<string[]> =>
  listEntries(folder, false);

const duplicateFileOnce = Effect.fn("LocalFile.duplicateFileOnce")(
  function* run(source: string, target: string, mode: number) {
    if (yield* hasFile(target)) {
      return;
    }

    yield* Effect.promise(() => copyFile(source, target));
    yield* Effect.promise(() => chmod(target, mode));
  }
);

const toJsonFileReader = <Value>(
  schema: Schema.Codec<Value, unknown>
): ((file: string) => Effect.Effect<Value | null>) => {
  const decode = Schema.decodeUnknownEffect(Schema.fromJsonString(schema));

  return Effect.fn("LocalFile.readJson")(function* run(file: string) {
    const text = yield* toNullIfMissing(() => readFile(file, "utf-8"));

    if (text === null) {
      return null;
    }

    return yield* decode(text).pipe(Effect.orDie);
  });
};

export {
  duplicateFileOnce,
  hasFile,
  listFileNames,
  listFolderNames,
  toFileStamp,
  toJsonFileReader,
};

export type { FileStamp };
