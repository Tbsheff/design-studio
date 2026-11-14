import { glob, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  listAppRoutes,
  matchRouteFile,
  TEXT_SEARCH_FILES_MAX,
} from "./deps.js";
import type { CanvasFileFrame, Direction, Project, TextSkip } from "./deps.js";
import { TextSearchError } from "./errors.js";

interface SearchTarget {
  readonly project: Project;
  readonly direction: Direction;
  readonly frames: readonly CanvasFileFrame[];
}

interface ScopeFile {
  readonly relative: string;
  readonly absolute: string;
  readonly frame: string | null;
}

interface Scope {
  readonly files: readonly ScopeFile[];
  readonly skipped: readonly TextSkip[];
}

interface AppWalk {
  readonly appRoot: string;
  readonly seen: Map<string, string>;
}

const PAGE_FILE = /\.(?:html?|jsx|tsx)$/iu;

const SCAN_FILE = /\.(?:html?|jsx|tsx|js)$/iu;

const SKIPPED_DIRS = new Set(["node_modules", "dist", "build", "out"]);

const IMPORT_DEPTH_MAX = 4;

const IMPORT_SPEC =
  /\b(?:from|import)[\s(]{0,4}["'](?<spec>[^"'\n]{1,300})["']/gu;

const RESOLVE_SUFFIXES = [
  "",
  ".tsx",
  ".jsx",
  ".ts",
  ".js",
  "/index.tsx",
  "/index.jsx",
  "/index.ts",
  "/index.js",
];

const toPosix = (value: string): string => value.split(path.sep).join("/");

const isSkippedPath = (relative: string): boolean =>
  relative
    .split("/")
    .some((part) => part.startsWith(".") || SKIPPED_DIRS.has(part));

const toTrimSlashes = (value: string): string => {
  let start = 0;

  while (value.charAt(start) === "/") {
    start += 1;
  }

  return value.slice(start);
};

const toPageKey = (value: string | null, entry: string): string => {
  const [bare = ""] = (value ?? "").split(/[?#]/u);
  const key = toTrimSlashes(bare);

  if (key === "") {
    return toTrimSlashes(entry);
  }

  return key;
};

const toFramesOf = (target: SearchTarget): CanvasFileFrame[] =>
  target.frames.filter(
    (frame) =>
      (frame.directionId ?? target.direction.id) === target.direction.id
  );

const toFrameFor = (
  frames: readonly CanvasFileFrame[],
  relative: string,
  entry: string
): string | null =>
  frames.find((frame) => toPageKey(frame.path ?? null, entry) === relative)
    ?.id ?? null;

const toProjectFiles = async (target: SearchTarget): Promise<ScopeFile[]> => {
  const root = target.direction.workTree;
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const frames = toFramesOf(target);
  const files: ScopeFile[] = [];

  for (const entry of entries) {
    const absolute = path.join(entry.parentPath, entry.name);
    const relative = toPosix(path.relative(root, absolute));
    const isPage = entry.isFile() && PAGE_FILE.test(entry.name);

    if (isPage && !isSkippedPath(relative)) {
      const frame = toFrameFor(frames, relative, target.project.entry);

      files.push({ absolute, frame, relative });
    }
  }

  return files.toSorted((left, right) =>
    left.relative.localeCompare(right.relative)
  );
};

const isFile = async (absolute: string): Promise<boolean> => {
  try {
    const info = await stat(absolute);

    return info.isFile();
  } catch {
    return false;
  }
};

const toFirstFile = async (
  candidates: readonly string[]
): Promise<string | null> => {
  const options = candidates.flatMap((candidate) =>
    RESOLVE_SUFFIXES.map((suffix) => candidate + suffix)
  );

  const found = await Promise.all(options.map((option) => isFile(option)));
  const index = found.indexOf(true);

  return options[index] ?? null;
};

const toResolveImport = (
  from: string,
  spec: string,
  appRoot: string
): Promise<string | null> => {
  if (spec.startsWith(".")) {
    return toFirstFile([path.resolve(path.dirname(from), spec)]);
  }

  if (spec.startsWith("@/") || spec.startsWith("~/")) {
    const rest = spec.slice(2);

    return toFirstFile([
      path.join(appRoot, "src", rest),
      path.join(appRoot, rest),
    ]);
  }

  return Promise.resolve(null);
};

const toImportsOf = async (absolute: string): Promise<string[]> => {
  try {
    const source = await readFile(absolute, "utf-8");

    return [...source.matchAll(IMPORT_SPEC)].map(
      (match) => match.groups?.spec ?? ""
    );
  } catch {
    return [];
  }
};

interface WalkEntry {
  readonly frame: string;
  readonly file: string;
}

const toNextFiles = async (
  entry: WalkEntry,
  walk: AppWalk
): Promise<WalkEntry[]> => {
  const specs = await toImportsOf(entry.file);

  const resolved = await Promise.all(
    specs.map((spec) => toResolveImport(entry.file, spec, walk.appRoot))
  );

  return resolved
    .filter((item) => item !== null)
    .map((file) => ({ file, frame: entry.frame }));
};

const isNewFile = (file: string, walk: AppWalk): boolean =>
  !walk.seen.has(file) && !file.includes(`${path.sep}node_modules${path.sep}`);

const toWalkLevel = async (
  level: readonly WalkEntry[],
  walk: AppWalk,
  depth: number
): Promise<void> => {
  const fresh: WalkEntry[] = [];

  for (const entry of level) {
    if (isNewFile(entry.file, walk)) {
      walk.seen.set(entry.file, entry.frame);
      fresh.push(entry);
    }
  }

  if (fresh.length === 0 || depth > IMPORT_DEPTH_MAX) {
    return;
  }

  const next = await Promise.all(
    fresh.map((entry) => toNextFiles(entry, walk))
  );

  await toWalkLevel(next.flat(), walk, depth + 1);
};

const toRouteFiles = async (
  target: SearchTarget,
  appDir: string
): Promise<WalkEntry[]> => {
  const root = target.direction.workTree;
  const routes = await listAppRoutes(root, appDir);
  const out: WalkEntry[] = [];

  for (const frame of toFramesOf(target)) {
    const route = matchRouteFile(routes, frame.path ?? "/");

    if (route !== null) {
      out.push({ file: path.join(root, route), frame: frame.id });
    }
  }

  return out;
};

const toAppFiles = async (
  target: SearchTarget,
  appDir: string
): Promise<ScopeFile[]> => {
  const root = target.direction.workTree;
  const walk: AppWalk = { appRoot: path.join(root, appDir), seen: new Map() };

  const starts = await toRouteFiles(target, appDir);

  await toWalkLevel(starts, walk, 0);

  const files: ScopeFile[] = [];

  for (const [absolute, frame] of walk.seen) {
    if (SCAN_FILE.test(absolute)) {
      const relative = toPosix(path.relative(root, absolute));

      files.push({ absolute, frame, relative });
    }
  }

  return files;
};

const toCleanPattern = (value: string): string => {
  const clean = toTrimSlashes(value.trim().replace(/^\.\//u, ""));

  if (path.isAbsolute(value) || clean.split(/[/\\]/u).includes("..")) {
    throw new TextSearchError(
      "glob must be a folder or pattern inside the project, with no .. part."
    );
  }

  return clean;
};

const isGlobPattern = (clean: string): boolean => /[*?[{]/u.test(clean);

const toPatternOf = (value: string): string => {
  const clean = toCleanPattern(value);

  if (isGlobPattern(clean)) {
    return clean;
  }

  return `${clean}/**/*`;
};

const toExactFiles = async (
  target: SearchTarget,
  value: string
): Promise<ScopeFile[]> => {
  const clean = toCleanPattern(value);

  if (isGlobPattern(clean) || !SCAN_FILE.test(clean) || isSkippedPath(clean)) {
    return [];
  }

  const absolute = path.join(target.direction.workTree, clean);

  if (!(await isFile(absolute))) {
    return [];
  }

  return [{ absolute, frame: null, relative: toPosix(clean) }];
};

const isExcluded = (name: string): boolean =>
  name === "node_modules" || name.startsWith(".");

const toGlobFiles = async (
  target: SearchTarget,
  value: string
): Promise<ScopeFile[]> => {
  const exact = await toExactFiles(target, value);

  if (exact.length > 0) {
    return exact;
  }

  const root = target.direction.workTree;
  const files: ScopeFile[] = [];
  const matches = glob(toPatternOf(value), { cwd: root, exclude: isExcluded });

  for await (const match of matches) {
    const relative = toPosix(match);

    if (SCAN_FILE.test(relative) && !isSkippedPath(relative)) {
      files.push({ absolute: path.join(root, match), frame: null, relative });
    }
  }

  return files;
};

const toBaseFiles = (target: SearchTarget): Promise<ScopeFile[]> => {
  const { app } = target.project;

  if (app) {
    return toAppFiles(target, app.appDir);
  }

  return toProjectFiles(target);
};

const toScopeOf = async (
  target: SearchTarget,
  pattern: string | null
): Promise<Scope> => {
  const all = await toBaseFiles(target);

  if (pattern !== null) {
    const known = new Set(all.map((file) => file.relative));
    const extra = await toGlobFiles(target, pattern);

    all.push(...extra.filter((file) => !known.has(file.relative)));
  }

  const skipped = all.slice(TEXT_SEARCH_FILES_MAX).map((file) => ({
    file: file.relative,
    reason: `over the limit of ${TEXT_SEARCH_FILES_MAX} files`,
  }));

  return { files: all.slice(0, TEXT_SEARCH_FILES_MAX), skipped };
};

export { toScopeOf as scopeOf };

export type { Scope, ScopeFile, SearchTarget };
