interface ManifestFile {
  readonly mode: number;
  readonly path: string;
}

const SYMLINK_TYPE = 10;

const MODE_TYPE_DIVISOR = 4096;

const MODE_TYPE_COUNT = 16;

const EXECUTED_NAMES: readonly RegExp[] = [
  /^vite\.config\.[^/]+$/u,
  /^vitest\.config\.[^/]+$/u,
  /^webpack\.config\.[^/]+$/u,
  /^rollup\.config\.[^/]+$/u,
  /^postcss\.config\.[^/]+$/u,
  /^tailwind\.config\.[^/]+$/u,
  /^babel\.config\.[^/]+$/u,
  /^next\.config\.[^/]+$/u,
  /^esbuild\.config\.[^/]+$/u,
  /^\.babelrc\.[^/]+$/u,
  /^package\.json$/u,
];

const toBaseName = (path: string): string => path.split("/").at(-1) ?? path;

const isSymlinkMode = (mode: number): boolean =>
  Math.floor(mode / MODE_TYPE_DIVISOR) % MODE_TYPE_COUNT === SYMLINK_TYPE;

const isExecutedPath = (path: string): boolean => {
  const name = toBaseName(path);

  return EXECUTED_NAMES.some((pattern) => pattern.test(name));
};

const isUnsafePath = (path: string): boolean =>
  path.startsWith("/") || path.split("/").some((part) => part === "..");

const findRefusedFile = (files: readonly ManifestFile[]): ManifestFile | null =>
  files.find(
    (file) =>
      isExecutedPath(file.path) ||
      isSymlinkMode(file.mode) ||
      isUnsafePath(file.path)
  ) ?? null;

export { findRefusedFile, isExecutedPath, isSymlinkMode, isUnsafePath };

export type { ManifestFile };
