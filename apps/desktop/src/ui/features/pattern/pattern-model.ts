import { copy } from "./copy.js";
import type {
  RouteInput,
  RouteOutput,
  SelectionContext,
  patternRoutes,
} from "./deps.js";

type PatternItem = RouteOutput<
  typeof patternRoutes.listPattern
>["items"][number];

type PatternInserted = RouteOutput<typeof patternRoutes.insertPattern>;

type PatternPosition = NonNullable<
  RouteInput<typeof patternRoutes.insertPattern>["position"]
>;

interface PatternTarget {
  readonly source: {
    readonly col: number;
    readonly file: string;
    readonly line: number;
  };
  readonly tag: string;
}

interface PositionOption {
  readonly id: PatternPosition;
  readonly label: string;
}

const POSITIONS: readonly PositionOption[] = [
  { id: "inside", label: copy.inside },
  { id: "after", label: copy.after },
  { id: "before", label: copy.before },
  { id: "replace", label: copy.replace },
];

const isPosition = (value: string): value is PatternPosition =>
  POSITIONS.some((option) => option.id === value);

const toTarget = (selection: SelectionContext | null): PatternTarget | null => {
  if (selection === null || selection.source === null) {
    return null;
  }

  const { col, file, line } = selection.source;

  return { source: { col, file, line }, tag: selection.tag };
};

const toTagList = (text: string): string[] =>
  text
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");

const toMeta = (item: PatternItem): string =>
  `${item.importCount} imports, ${item.tokenCount} tokens, from ${item.sourceName}`;

const isMatch = (item: PatternItem, query: string): boolean => {
  const needle = query.trim().toLowerCase();

  if (needle === "") {
    return true;
  }

  return [item.name, item.sourceName, ...item.tags].some((text) =>
    text.toLowerCase().includes(needle)
  );
};

const toSuggestedName = (tag: string): string => {
  const word = tag.trim();

  if (word === "") {
    return "";
  }

  return `${word.charAt(0).toUpperCase()}${word.slice(1)} pattern`;
};

type InsertTab = "components" | "patterns";

type SaveTab = "layer" | "site";

type PatternCandidate = RouteOutput<
  typeof patternRoutes.inspectPattern
>["items"][number];

const SITE_WIDTH = 1280;

const SITE_LIMIT = 24;

const isSiteUrl = (text: string): boolean =>
  /^https?:\/\/\S+$/u.test(text.trim());

const toCandidateName = (candidate: PatternCandidate): string => {
  const [, detail = ""] = candidate.label.split(": ");

  if (detail !== "") {
    return detail;
  }

  return candidate.label;
};

const toSourceHost = (item: PatternItem): string | null => {
  const source = item.sourceUrl ?? null;

  if (item.origin !== "url" || source === null) {
    return null;
  }

  try {
    return new URL(source).host;
  } catch {
    return null;
  }
};

export {
  isMatch,
  isPosition,
  isSiteUrl,
  POSITIONS,
  SITE_LIMIT,
  SITE_WIDTH,
  toCandidateName,
  toMeta,
  toSourceHost,
  toSuggestedName,
  toTagList,
  toTarget,
};

export type {
  InsertTab,
  PatternInserted,
  PatternCandidate,
  PatternItem,
  PatternPosition,
  PatternTarget,
  SaveTab,
};
