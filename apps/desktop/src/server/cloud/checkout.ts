import { lstat, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { Effect, Result } from "effect";

type CheckoutCode =
  | "executed_file"
  | "path_escape"
  | "symlink"
  | "write_failed";

type CheckoutResult =
  | { readonly code: CheckoutCode; readonly ok: false; readonly path: string }
  | { readonly files: number; readonly ok: true };

interface CheckoutEntry {
  readonly bytes: Uint8Array;
  readonly kind: "file" | "symlink";
  readonly path: string;
}

const FILE_MODE = 0o644;
const DIR_MODE = 0o755;
const EXECUTED_DIRS = new Set([".claude", ".git", ".husky", ".vscode"]);
const CONFIG_PATTERN = /^(?:vite|postcss|tailwind)\.config\.[^/]+$/u;
const ENV_PATTERN = /^\.env(?:\..*)?$/u;
const WINDOWS_DRIVE = /^[a-zA-Z]:/u;

const toSegments = (entryPath: string): readonly string[] | null => {
  if (entryPath === "" || WINDOWS_DRIVE.test(entryPath)) {
    return null;
  }

  if (entryPath.includes("\0") || entryPath.includes("\\")) {
    return null;
  }

  if (entryPath.startsWith("/")) {
    return null;
  }

  const segments = entryPath.split("/");

  if (segments.some((part) => part === "" || part === "." || part === "..")) {
    return null;
  }

  return segments;
};

const hasPackageScripts = (bytes: Uint8Array): boolean => {
  const parsed = Result.try(
    (): object | null =>
      JSON.parse(new TextDecoder().decode(bytes)) as object | null
  );

  if (Result.isFailure(parsed)) {
    return true;
  }

  return !(parsed.success instanceof Object) || "scripts" in parsed.success;
};

const isExecutedFile = (
  segments: readonly string[],
  bytes: Uint8Array
): boolean => {
  const [first = ""] = segments;
  const name = segments.at(-1) ?? "";

  if (EXECUTED_DIRS.has(first)) {
    return true;
  }

  if (CONFIG_PATTERN.test(name) || ENV_PATTERN.test(name)) {
    return true;
  }

  return name === "package.json" && hasPackageScripts(bytes);
};

const inspectEntry = (entry: CheckoutEntry): CheckoutResult | null => {
  if (entry.kind === "symlink") {
    return { code: "symlink", ok: false, path: entry.path };
  }

  const segments = toSegments(entry.path);

  if (segments === null) {
    return { code: "path_escape", ok: false, path: entry.path };
  }

  if (isExecutedFile(segments, entry.bytes)) {
    return { code: "executed_file", ok: false, path: entry.path };
  }

  return null;
};

const inspectCheckout = (
  entries: readonly CheckoutEntry[]
): CheckoutResult | null => {
  for (const entry of entries) {
    const refused = inspectEntry(entry);

    if (refused !== null) {
      return refused;
    }
  }

  return null;
};

const isSymlinkAt = (target: string): Effect.Effect<boolean> =>
  Effect.promise(() => lstat(target)).pipe(
    Effect.map((stat) => stat.isSymbolicLink()),
    Effect.orElseSucceed(() => false)
  );

const toRefused = (
  code: CheckoutCode,
  entry: CheckoutEntry
): CheckoutResult => ({ code, ok: false, path: entry.path });

const WRITTEN: CheckoutResult = { files: 1, ok: true };

const toWrittenEntry = Effect.fn("toWrittenEntry")(function* run(
  root: string,
  entry: CheckoutEntry
) {
  const target = path.join(root, ...entry.path.split("/"));
  const parent = path.dirname(target);

  yield* Effect.promise(() =>
    mkdir(parent, { mode: DIR_MODE, recursive: true })
  );

  const isLinked = (yield* isSymlinkAt(parent)) || (yield* isSymlinkAt(target));

  if (isLinked) {
    return toRefused("symlink", entry);
  }

  const temp = `${target}.checkout-tmp`;

  yield* Effect.promise(() =>
    writeFile(temp, entry.bytes, { flag: "w", mode: FILE_MODE })
  );
  yield* Effect.promise(() => rename(temp, target));

  return WRITTEN;
});

const deleteTemp = (root: string, entry: CheckoutEntry): Effect.Effect<void> =>
  Effect.promise(() =>
    rm(`${path.join(root, entry.path)}.checkout-tmp`, { force: true })
  ).pipe(Effect.ignore);

const toEntryResult = (
  root: string,
  entry: CheckoutEntry
): Effect.Effect<CheckoutResult> =>
  toWrittenEntry(root, entry).pipe(
    Effect.catchDefect(() =>
      deleteTemp(root, entry).pipe(Effect.as(toRefused("write_failed", entry)))
    ),
    Effect.tap((result) => {
      if (result.ok) {
        return Effect.void;
      }

      return deleteTemp(root, entry);
    })
  );

const runCheckout = Effect.fn("runCheckout")(function* run(
  root: string,
  entries: readonly CheckoutEntry[]
) {
  const refused = inspectCheckout(entries);

  if (refused !== null) {
    return refused;
  }

  const resolvedRoot = path.resolve(root);

  yield* Effect.promise(() =>
    mkdir(resolvedRoot, { mode: DIR_MODE, recursive: true })
  );

  const results = yield* Effect.all(
    entries.map((entry) => toEntryResult(resolvedRoot, entry)),
    { concurrency: "unbounded" }
  );

  const failed = results.find((result) => !result.ok);

  return failed ?? { files: results.length, ok: true };
});

export { runCheckout, inspectCheckout };

export type { CheckoutCode, CheckoutEntry, CheckoutResult };
