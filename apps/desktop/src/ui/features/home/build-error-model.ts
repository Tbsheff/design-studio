const BUILD_ERROR_SOURCES = [
  "build",
  "console",
  "runtime",
  "unhandledrejection",
] as const;

type BuildErrorSource = (typeof BUILD_ERROR_SOURCES)[number];

interface BuildError {
  readonly id: string;
  readonly directionId: string | null;
  readonly source: BuildErrorSource;
  readonly message: string;
  readonly file: string | null;
  readonly line: number | null;
  readonly ts: number;
}

type NewBuildError = Omit<BuildError, "id" | "ts">;

interface FilesChange {
  readonly directionId: string;
  readonly changedAt: number;
  readonly receivedAt: number;
  readonly paths: string[];
  readonly shouldReload: boolean;
}

const MAX_ERRORS = 50;

const isSameBuildError = (known: BuildError, entry: NewBuildError): boolean =>
  known.message === entry.message &&
  known.file === entry.file &&
  known.line === entry.line;

const toErrorsWith = (
  previous: BuildError[],
  entry: NewBuildError,
  now: number
): BuildError[] => {
  if (previous.some((known) => isSameBuildError(known, entry))) {
    return previous;
  }

  return [
    ...previous.slice(1 - MAX_ERRORS),
    { ...entry, id: `${now}-${previous.length}`, ts: now },
  ];
};

export { toErrorsWith };

export type { BuildError, BuildErrorSource, FilesChange, NewBuildError };
