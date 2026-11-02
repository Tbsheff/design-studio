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

const trimSlashes = (value: string): string => {
  let start = 0;

  while (value.charAt(start) === "/") {
    start += 1;
  }

  return value.slice(start);
};

const pageKey = (value: string | null, entry: string): string => {
  const [bare = ""] = (value ?? "").split(/[?#]/u);
  const key = trimSlashes(bare);

  if (key === "") {
    return trimSlashes(entry);
  }

  return key;
};

const framesOf = (target: SearchTarget): CanvasFileFrame[] =>
  target.frames.filter(
    (frame) =>
      (frame.directionId ?? target.direction.id) === target.direction.id
  );

const frameFor = (
  frames: readonly CanvasFileFrame[],
  relative: string,
  entry: string
): string | null =>
  frames.find((frame) => pageKey(frame.path ?? null, entry) === relative)?.id ??
  null;

const projectFiles = async (target: SearchTarget): Promise<ScopeFile[]> => {
  const root = target.direction.workTree;
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const frames = framesOf(target);
  const files: ScopeFile[] = [];

  for (const entry of entries) {
    const absolute = path.join(entry.parentPath, entry.name);
    const relative = toPosix(path.relative(root, absolute));
    const isPage = entry.isFile() && PAGE_FILE.test(entry.name);

    if (isPage && !isSkippedPath(relative)) {
      const frame = frameFor(frames, relative, target.project.entry);

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

const firstFile = async (
  candidates: readonly string[]
): Promise<string | null> => {
  const options = candidates.flatMap((candidate) =>
    RESOLVE_SUFFIXES.map((suffix) => candidate + suffix)
  );

  const found = await Promise.all(options.map((option) => isFile(option)));
  const index = found.indexOf(true);

  return options[index] ?? null;
};

const resolveImport = (
  from: string,
  spec: string,
  appRoot: string
): Promise<string | null> => {
  if (spec.startsWith(".")) {
    return firstFile([path.resolve(path.dirname(from), spec)]);
  }

  if (spec.startsWith("@/") || spec.startsWith("~/")) {
    const rest = spec.slice(2);

    return firstFile([
      path.join(appRoot, "src", rest),
      path.join(appRoot, rest),
    ]);
  }

  return Promise.resolve(null);
};

const importsOf = async (absolute: string): Promise<string[]> => {
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

const nextFiles = async (
  entry: WalkEntry,
  walk: AppWalk
): Promise<WalkEntry[]> => {
  const specs = await importsOf(entry.file);

  const resolved = await Promise.all(
    specs.map((spec) => resolveImport(entry.file, spec, walk.appRoot))
  );

  return resolved
    .filter((item) => item !== null)
    .map((file) => ({ file, frame: entry.frame }));
};

const isNewFile = (file: string, walk: AppWalk): boolean =>
  !walk.seen.has(file) && !file.includes(`${path.sep}node_modules${path.sep}`);

const walkLevel = async (
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

  const next = await Promise.all(fresh.map((entry) => nextFiles(entry, walk)));

  await walkLevel(next.flat(), walk, depth + 1);
};

const routeFiles = async (
  target: SearchTarget,
  appDir: string
): Promise<WalkEntry[]> => {
  const root = target.direction.workTree;
  const routes = await listAppRoutes(root, appDir);
  const out: WalkEntry[] = [];

  for (const frame of framesOf(target)) {
    const route = matchRouteFile(routes, frame.path ?? "/");

    if (route !== null) {
      out.push({ file: path.join(root, route), frame: frame.id });
    }
  }

  return out;
};

const appFiles = async (
  target: SearchTarget,
  appDir: string
): Promise<ScopeFile[]> => {
  const root = target.direction.workTree;
  const walk: AppWalk = { appRoot: path.join(root, appDir), seen: new Map() };

  const starts = await routeFiles(target, appDir);

  await walkLevel(starts, walk, 0);

  const files: ScopeFile[] = [];

  for (const [absolute, frame] of walk.seen) {
    if (SCAN_FILE.test(absolute)) {
      const relative = toPosix(path.relative(root, absolute));

      files.push({ absolute, frame, relative });
    }
  }

  return files;
};

const patternOf = (value: string): string => {
  const clean = trimSlashes(value.trim().replace(/^\.\//u, ""));

  if (path.isAbsolute(value) || clean.split(/[/\\]/u).includes("..")) {
    throw new TextSearchError(
      "glob must be a folder or pattern inside the project, with no .. part."
    );
  }

  if (/[*?[{]/u.test(clean)) {
    return clean;
  }

  return `${clean}/**/*`;
};

const isExcluded = (name: string): boolean =>
  name === "node_modules" || name.startsWith(".");

const globFiles = async (
  target: SearchTarget,
  value: string
): Promise<ScopeFile[]> => {
  const root = target.direction.workTree;
  const files: ScopeFile[] = [];
  const matches = glob(patternOf(value), { cwd: root, exclude: isExcluded });

  for await (const match of matches) {
    const relative = toPosix(match);

    if (SCAN_FILE.test(relative) && !isSkippedPath(relative)) {
      files.push({ absolute: path.join(root, match), frame: null, relative });
    }
  }

  return files;
};

const baseFiles = (target: SearchTarget): Promise<ScopeFile[]> => {
  const { app } = target.project;

  if (app) {
    return appFiles(target, app.appDir);
  }

  return projectFiles(target);
};

const scopeOf = async (
  target: SearchTarget,
  pattern: string | null
): Promise<Scope> => {
  const all = await baseFiles(target);

  if (pattern !== null) {
    const known = new Set(all.map((file) => file.relative));
    const extra = await globFiles(target, pattern);

    all.push(...extra.filter((file) => !known.has(file.relative)));
  }

  const skipped = all.slice(TEXT_SEARCH_FILES_MAX).map((file) => ({
    file: file.relative,
    reason: `over the limit of ${TEXT_SEARCH_FILES_MAX} files`,
  }));

  return { files: all.slice(0, TEXT_SEARCH_FILES_MAX), skipped };
};

export { scopeOf };

export type { Scope, ScopeFile, SearchTarget };
