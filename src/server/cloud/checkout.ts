import { lstat, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

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
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));

    return !(parsed instanceof Object) || "scripts" in parsed;
  } catch {
    return true;
  }
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

const isSymlinkAt = async (target: string): Promise<boolean> => {
  try {
    const stat = await lstat(target);

    return stat.isSymbolicLink();
  } catch {
    return false;
  }
};

const toWrittenEntry = async (
  root: string,
  entry: CheckoutEntry
): Promise<void> => {
  const target = path.join(root, ...entry.path.split("/"));
  const parent = path.dirname(target);
  await mkdir(parent, { mode: DIR_MODE, recursive: true });

  if ((await isSymlinkAt(parent)) || (await isSymlinkAt(target))) {
    throw new Error("symlink");
  }

  const temp = `${target}.checkout-tmp`;
  await writeFile(temp, entry.bytes, { flag: "w", mode: FILE_MODE });
  await rename(temp, target);
};

const toEntryResult = async (
  root: string,
  entry: CheckoutEntry
): Promise<CheckoutResult> => {
  try {
    await toWrittenEntry(root, entry);

    return { files: 1, ok: true };
  } catch (error) {
    await rm(`${path.join(root, entry.path)}.checkout-tmp`, { force: true });
    const isLink = error instanceof Error && error.message === "symlink";

    if (isLink) {
      return { code: "symlink", ok: false, path: entry.path };
    }

    return { code: "write_failed", ok: false, path: entry.path };
  }
};

const runCheckout = async (
  root: string,
  entries: readonly CheckoutEntry[]
): Promise<CheckoutResult> => {
  const refused = inspectCheckout(entries);

  if (refused !== null) {
    return refused;
  }

  const resolvedRoot = path.resolve(root);
  await mkdir(resolvedRoot, { mode: DIR_MODE, recursive: true });

  const results = await Promise.all(
    entries.map((entry) => toEntryResult(resolvedRoot, entry))
  );

  const failed = results.find((result) => !result.ok);

  return failed ?? { files: results.length, ok: true };
};

export { runCheckout, inspectCheckout };

export type { CheckoutCode, CheckoutEntry, CheckoutResult };
