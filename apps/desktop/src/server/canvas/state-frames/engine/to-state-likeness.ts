import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import { DEFAULT_FRAME_STATE } from "@design-studio/contracts/frame-state";

import { toBoardLabel, toPageOf } from "./to-state-board.js";
import type { BoardState } from "./to-state-board.js";

interface StateLikeness {
  readonly isSameAsDefault: boolean;
  readonly similarity: number;
}

interface CheckFrame {
  readonly frameId: string;
  readonly label: string;
  readonly state: string;
  readonly stateName: string;
}

interface CheckBoard {
  readonly base: CheckFrame;
  readonly page: string;
  readonly states: readonly CheckFrame[];
}

interface CheckBoardInput {
  readonly frames: readonly CanvasFileFrame[];
  readonly pinned: Readonly<Record<string, string>>;
  readonly source: CanvasFileFrame;
  readonly states: readonly BoardState[];
}

const CHECK_STATE_MAX = 8;

const PERCENT = 100;

const SIMILARITY_STEP = 1000;

const toStateLikeness = (
  differsPct: number,
  threshold: number
): StateLikeness => {
  const raw = Math.max(0, Math.min(1, 1 - differsPct / PERCENT));
  const similarity = Math.round(raw * SIMILARITY_STEP) / SIMILARITY_STEP;

  return { isSameAsDefault: similarity >= threshold, similarity };
};

const toStateOf = (
  frame: CanvasFileFrame,
  input: CheckBoardInput,
  page: string
): string => {
  const pinned = input.pinned[frame.id] ?? null;

  if (pinned !== null) {
    return pinned;
  }

  const named = input.states.find(
    (state) => frame.label === toBoardLabel(state, page)
  );

  return named?.id ?? DEFAULT_FRAME_STATE;
};

const toStateName = (input: CheckBoardInput, state: string): string =>
  input.states.find((item) => item.id === state)?.name ?? state;

const toCheckFrame = (
  frame: CanvasFileFrame,
  input: CheckBoardInput,
  stateId: string
): CheckFrame => ({
  frameId: frame.id,
  label: frame.label ?? frame.id,
  state: stateId,
  stateName: toStateName(input, stateId),
});

const isAbove = (first: CanvasFileFrame, second: CanvasFileFrame): boolean => {
  if (first.y !== second.y) {
    return first.y < second.y;
  }

  return first.x < second.x;
};

const toTopFrame = (
  frames: readonly CanvasFileFrame[]
): CanvasFileFrame | null => {
  let top: CanvasFileFrame | null = null;

  for (const frame of frames) {
    if (top === null || isAbove(frame, top)) {
      top = frame;
    }
  }

  return top;
};

const toCheckBoard = (input: CheckBoardInput): CheckBoard | null => {
  const pagePath = toPageOf(input.source);

  const onPage = input.frames.filter(
    (frame) => frame.hidden !== true && toPageOf(frame) === pagePath
  );

  const bases: CanvasFileFrame[] = [];
  const states: CheckFrame[] = [];

  for (const frame of onPage) {
    const stateId = toStateOf(frame, input, pagePath);

    if (stateId === DEFAULT_FRAME_STATE) {
      bases.push(frame);
    } else {
      states.push(toCheckFrame(frame, input, stateId));
    }
  }

  const base = toTopFrame(bases);
  const shown = states.slice(0, CHECK_STATE_MAX);

  if (base === null || shown.length === 0) {
    return null;
  }

  return {
    base: toCheckFrame(base, input, DEFAULT_FRAME_STATE),
    page: pagePath,
    states: shown,
  };
};

export { toCheckBoard, toStateLikeness };

export type { CheckBoard, CheckBoardInput, CheckFrame, StateLikeness };
