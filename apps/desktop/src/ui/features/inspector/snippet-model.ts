type Snippet =
  | { readonly kind: "loading" }
  | {
      readonly kind: "ready";
      readonly code: string;
      readonly file: string;
      readonly line: number;
      readonly isExact: boolean;
    }
  | { readonly kind: "error"; readonly message: string };

interface SourcePoint {
  readonly col: number | null;
  readonly file: string | null;
  readonly line: number | null;
}

interface RequestOptions {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly fallback: string;
  readonly point: SourcePoint;
  readonly tick: number;
}

interface SnippetRequest {
  readonly projectId: string;
  readonly directionId: string;
  readonly source: {
    readonly col: number;
    readonly file: string;
    readonly line: number;
  };
  readonly fallback: string;
  readonly tick: number;
}

const toFallbackSnippet = (fallback: string): Snippet => ({
  code: fallback,
  file: "",
  isExact: false,
  kind: "ready",
  line: 0,
});

const toSnippetRequest = (options: RequestOptions): SnippetRequest | null => {
  const { projectId, directionId, fallback, tick } = options;
  const { col, file, line } = options.point;

  if (!directionId || file === null || line === null || col === null) {
    return null;
  }

  const source = { col, file, line };

  return { directionId, fallback, projectId, source, tick };
};

const toLoadedSnippet = (
  result: {
    readonly code: string | null;
    readonly file: string;
    readonly line: number;
  },
  fallback: string
): Snippet => {
  if (result.code === null) {
    return {
      code: fallback,
      file: result.file,
      isExact: false,
      kind: "ready",
      line: result.line,
    };
  }

  return {
    code: result.code,
    file: result.file,
    isExact: true,
    kind: "ready",
    line: result.line,
  };
};

const toKeepReady = (previous: Snippet): Snippet => {
  if (previous.kind === "ready") {
    return previous;
  }

  return { kind: "loading" };
};

const toFileLabel = (snippet: Snippet): string => {
  if (snippet.kind === "ready" && snippet.file) {
    return `${snippet.file}:${snippet.line}`;
  }

  return "Rendered HTML";
};

const toFileTip = (snippet: Snippet): string | null => {
  if (snippet.kind === "ready" && snippet.file) {
    return `${snippet.file}:${snippet.line}`;
  }

  return null;
};

export {
  toFallbackSnippet,
  toFileLabel,
  toFileTip,
  toKeepReady,
  toLoadedSnippet,
  toSnippetRequest,
};

export type { Snippet, SnippetRequest, SourcePoint };
