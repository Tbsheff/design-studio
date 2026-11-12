import type { LiveStore } from "../../platform/live-store.js";

interface LiveBudgetState {
  readonly near: readonly string[];
  readonly hovered: string | null;
}

interface StillRequest {
  readonly projectId: string;
  readonly frameId: string;
  readonly directionId: string | null;
}

interface StillJob {
  readonly key: string;
  readonly request: StillRequest;
}

interface FrameStills {
  readonly urls: Map<string, string>;
  readonly latest: Map<string, string>;
  readonly asked: Set<string>;
  readonly running: Set<string>;
  readonly jobs: StillJob[];
  readonly changes: LiveStore<number>;
}

interface FrameLiveSources {
  readonly budget: LiveStore<LiveBudgetState>;
  readonly stills: FrameStills;
  readonly zoomPercent: LiveStore<number>;
}

const LIVE_BUDGET = 3;

const READABLE_ZOOM_PERCENT = 75;

const MAX_STILLS = 64;

const NEAR_MARGIN = "15%";

const KEEP_MARGIN = "100%";

const HOVER_DELAY_MS = 200;

const NO_BUDGET: LiveBudgetState = { hovered: null, near: [] };

const isFrameLive = (
  state: LiveBudgetState,
  zoomPercent: number,
  id: string
): boolean => {
  const index = state.near.indexOf(id);

  if (index === -1) {
    return false;
  }

  return (
    state.hovered === id ||
    zoomPercent >= READABLE_ZOOM_PERCENT ||
    index < LIVE_BUDGET
  );
};

const toNearState = (
  state: LiveBudgetState,
  id: string,
  isNear: boolean
): LiveBudgetState => {
  const has = state.near.includes(id);

  if (isNear === has) {
    return state;
  }

  if (isNear) {
    return { ...state, near: [...state.near, id] };
  }

  return { ...state, near: state.near.filter((item) => item !== id) };
};

const toHoverState = (
  state: LiveBudgetState,
  id: string,
  isHovered: boolean
): LiveBudgetState => {
  if (isHovered) {
    return { ...state, hovered: id };
  }

  if (state.hovered !== id) {
    return state;
  }

  return { ...state, hovered: null };
};

const toStillKey = (
  frameId: string,
  src: string | null,
  width: number,
  height: number
): string | null => {
  if (!src) {
    return null;
  }

  return `${frameId}|${width}x${height}|${src}`;
};

const toStillUrl = (mimeType: string, data: string): string =>
  `data:${mimeType};base64,${data}`;

const toTrimmedStills = (
  urls: Map<string, string>,
  asked: Set<string>
): number => {
  let removed = 0;

  for (const key of urls.keys()) {
    if (urls.size <= MAX_STILLS) {
      break;
    }

    urls.delete(key);
    asked.delete(key);
    removed += 1;
  }

  return removed;
};

export {
  HOVER_DELAY_MS,
  KEEP_MARGIN,
  NEAR_MARGIN,
  NO_BUDGET,
  isFrameLive,
  toHoverState,
  toNearState,
  toStillKey,
  toStillUrl,
  toTrimmedStills,
};

export type {
  FrameLiveSources,
  FrameStills,
  LiveBudgetState,
  StillJob,
  StillRequest,
};
