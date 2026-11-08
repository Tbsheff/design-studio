import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { Effect } from "effect";

const HASH_LENGTH = 16;

const toRootedPath = (root: string, relative: string): string | null => {
  const resolved = path.resolve(root, relative);

  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) {
    return null;
  }

  return resolved;
};

const toDigest = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex").slice(0, HASH_LENGTH);

const getFileHash = Effect.fn("DevStatusHash.get")(function* run(
  root: string,
  relative: string
) {
  const file = toRootedPath(root, relative);

  if (file === null) {
    return null;
  }

  const bytes = yield* Effect.tryPromise({
    catch: (error) => error,
    try: () => readFile(file),
  }).pipe(Effect.orElseSucceed(() => null));

  if (bytes === null) {
    return null;
  }

  return toDigest(bytes);
});

const hasSourceFile = Effect.fn("DevStatusHash.has")(function* run(
  root: string,
  relative: string
) {
  const file = toRootedPath(root, relative);

  if (file === null) {
    return false;
  }

  return yield* Effect.tryPromise({
    catch: (error) => error,
    try: () => access(file),
  }).pipe(
    Effect.map(() => true),
    Effect.orElseSucceed(() => false)
  );
});

const getSourceFile = Effect.fn("DevStatusHash.getSource")(function* run(
  root: string,
  candidates: readonly string[]
) {
  const found = yield* Effect.all(
    candidates.map((candidate) => hasSourceFile(root, candidate))
  );

  return candidates.find((_candidate, index) => found[index] === true) ?? null;
});

export { getFileHash, getSourceFile };
