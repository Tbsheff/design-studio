import type {
  DraftSourceStatus,
  DraftSourcesState,
  RunStatus,
} from "@design-studio/contracts";
import type { Icon } from "@design-studio/ui";

type IconName = Parameters<typeof Icon>[0]["name"];

const MS_PER_SECOND = 1000;

const KIND_ICON: Record<DraftSourceStatus["kind"], IconName> = {
  brief: "pencil",
  "design-md": "doc",
  folder: "folder",
  images: "image",
  "tokens-file": "token",
  url: "globe",
};

const STATE_LABEL: Record<DraftSourceStatus["state"], string> = {
  blocked: "Blocked",
  failed: "Failed",
  queued: "Waiting",
  read: "Read",
  reading: "Reading",
  thin: "Little found",
};

const NEEDS_LOOK = new Set<DraftSourceStatus["state"]>([
  "thin",
  "blocked",
  "failed",
]);

const toSeconds = (source: DraftSourceStatus): string | null => {
  const ms = source.ms ?? null;

  if (ms === null) {
    return null;
  }

  if (ms < MS_PER_SECOND) {
    return `${ms} ms`;
  }

  return `${(ms / MS_PER_SECOND).toFixed(1)} s`;
};

const toSummary = (state: DraftSourcesState): string => {
  const real = state.sources.filter((source) => source.kind !== "images");

  const finished = real.filter(
    (source) => source.state !== "queued" && source.state !== "reading"
  ).length;

  if (!state.done) {
    return `Reading ${finished} of ${real.length}`;
  }

  const problems = real.filter(
    (source) => source.state === "blocked" || source.state === "failed"
  ).length;

  if (problems > 0) {
    return `${real.length - problems} of ${real.length} read`;
  }

  return "All read";
};

const toStartedNote = (end: RunStatus | null): string | null => {
  if (end === null || end === "running") {
    return "The AI step started. Follow its steps in the chat below.";
  }

  if (end === "completed") {
    return null;
  }

  if (end === "canceled") {
    return "The AI step was stopped. Ask the chat to improve this design system to run it again.";
  }

  return "The AI step did not finish. See the chat, then ask it to improve this design system.";
};

const toImproveNote = (
  state: DraftSourcesState,
  end: RunStatus | null
): string | null => {
  if (!state.done) {
    return "When every source is read, the AI step starts by itself.";
  }

  if (state.improve.state === "done") {
    return toStartedNote(state.improve.status ?? "completed");
  }

  if (state.improve.state === "started") {
    return toStartedNote(end);
  }

  if (state.improve.state === "skipped") {
    return state.improve.reason ?? null;
  }

  return null;
};

const isNoted = (source: DraftSourceStatus): boolean =>
  source.kind === "tokens-file" && (source.note ?? null) !== null;

const toVisibleSources = (
  state: DraftSourcesState,
  isOpen: boolean
): DraftSourceStatus[] => {
  if (isOpen || !state.done) {
    return state.sources;
  }

  return state.sources.filter(
    (source) => NEEDS_LOOK.has(source.state) || isNoted(source)
  );
};

const toToggleLabel = (isOpen: boolean): string => {
  if (isOpen) {
    return "Show only problems";
  }

  return "Show all sources";
};

const toToggleIcon = (isOpen: boolean): IconName => {
  if (isOpen) {
    return "chevronDown";
  }

  return "chevronRight";
};

export {
  KIND_ICON,
  STATE_LABEL,
  toImproveNote,
  toSeconds,
  toSummary,
  toToggleIcon,
  toToggleLabel,
  toVisibleSources,
};

export type { IconName };
