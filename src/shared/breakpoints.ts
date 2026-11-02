const BREAKPOINT_FALLBACK: readonly BreakpointEntry[] = [
  { name: "sm", px: 640 },
  { name: "md", px: 768 },
  { name: "lg", px: 1024 },
  { name: "xl", px: 1280 },
];

const BREAKPOINT_BASE = "base";

const BREAKPOINT_NAME = /^(?:base|[a-z0-9][a-z0-9-]{0,30})$/u;

const BREAKPOINT_VALUE_MAX = 400;

const BREAKPOINT_WIDTH_MAX = 10_000;

interface BreakpointEntry {
  readonly name: string;
  readonly px: number;
}

type BreakpointMode = "classes" | "css" | "none";

interface BreakpointOverride {
  readonly breakpoint: string;
  readonly prefix: string;
  readonly px: number | null;
  readonly props: readonly string[];
  readonly set: readonly string[];
}

interface BreakpointActive {
  readonly breakpoint: string;
  readonly frame: string | null;
  readonly px: number | null;
  readonly width: number;
}

interface BreakpointLayer {
  readonly file: string;
  readonly mode: BreakpointMode;
  readonly overrides: readonly BreakpointOverride[];
  readonly reason: string | null;
}

interface BreakpointListResult {
  readonly active: BreakpointActive | null;
  readonly breakpoints: readonly BreakpointEntry[];
  readonly layer: BreakpointLayer | null;
  readonly source: "theme" | "default";
}

interface BreakpointStyleInput {
  readonly breakpoint: string;
  readonly property: string;
  readonly reset: boolean;
  readonly value: string | null;
}

interface BreakpointStyleResult {
  readonly breakpoint: string;
  readonly classes: {
    readonly add: string[];
    readonly remove: string[];
  } | null;
  readonly files: readonly string[];
  readonly mode: BreakpointMode;
  readonly prefix: string;
  readonly property: string;
  readonly title: string;
  readonly value: string | null;
  readonly versionId: string | null;
}

export {
  BREAKPOINT_BASE,
  BREAKPOINT_FALLBACK,
  BREAKPOINT_NAME,
  BREAKPOINT_VALUE_MAX,
  BREAKPOINT_WIDTH_MAX,
};

export type {
  BreakpointActive,
  BreakpointEntry,
  BreakpointLayer,
  BreakpointListResult,
  BreakpointMode,
  BreakpointOverride,
  BreakpointStyleInput,
  BreakpointStyleResult,
};
