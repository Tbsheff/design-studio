import {
  CANVAS_MAX_COORD,
  CANVAS_MAX_SECTIONS,
  cleanFrameLabel,
  nextSectionId,
} from "@design-studio/contracts/canvas-file";
import type {
  CanvasFileFrame,
  CanvasSection,
} from "@design-studio/contracts/canvas-file";

interface BoardState {
  readonly id: string;
  readonly name: string;
}

interface BoardInput {
  readonly frames: readonly CanvasFileFrame[];
  readonly gap: number;
  readonly pinned: Readonly<Record<string, string>>;
  readonly source: CanvasFileFrame;
  readonly states: readonly BoardState[];
}

interface BoardSlot {
  readonly frameId: string | null;
  readonly height: number;
  readonly label: string;
  readonly state: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface BoardPoint {
  readonly x: number;
  readonly y: number;
}

interface BoardBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

const SECTION_PAD_SIDE = 48;

const SECTION_PAD_TOP = 120;

const ROW_GAP_FACTOR = 3;

const toPageOf = (frame: CanvasFileFrame): string => frame.path ?? "";

const toPageName = (page: string): string => `/${page}`;

const toBoardLabel = (state: BoardState, page: string): string =>
  cleanFrameLabel(`${state.name} ${toPageName(page)}`) ?? state.name;

const toSectionLabel = (page: string): string =>
  cleanFrameLabel(`${toPageName(page)} states`) ?? "States";

const toClamped = (value: number): number =>
  Math.max(-CANVAS_MAX_COORD, Math.min(CANVAS_MAX_COORD, Math.round(value)));

const isBoardFrame = (
  frame: CanvasFileFrame,
  input: BoardInput,
  state: BoardState
): boolean => {
  if (frame.id === input.source.id || frame.hidden === true) {
    return false;
  }

  if (toPageOf(frame) !== toPageOf(input.source)) {
    return false;
  }

  return (
    input.pinned[frame.id] === state.id ||
    frame.label === toBoardLabel(state, toPageOf(input.source))
  );
};

const toReusedFrame = (
  input: BoardInput,
  state: BoardState,
  taken: ReadonlySet<string>
): CanvasFileFrame | null =>
  input.frames.find(
    (frame) => !taken.has(frame.id) && isBoardFrame(frame, input, state)
  ) ?? null;

const isInColumns = (
  frame: CanvasFileFrame,
  left: number,
  right: number
): boolean => frame.x < right && frame.x + frame.width > left;

const toRowTop = (input: BoardInput, rowWidth: number): number => {
  const { source } = input;
  const right = source.x + rowWidth;

  let bottom = source.y + source.height;

  for (const frame of input.frames) {
    if (
      frame.hidden !== true &&
      frame.y >= source.y &&
      isInColumns(frame, source.x, right)
    ) {
      bottom = Math.max(bottom, frame.y + frame.height);
    }
  }

  return bottom + input.gap * ROW_GAP_FACTOR;
};

const toReusedSlot = (
  frame: CanvasFileFrame,
  state: BoardState,
  page: string
): BoardSlot => ({
  frameId: frame.id,
  height: frame.height,
  label: toBoardLabel(state, page),
  state: state.id,
  width: frame.width,
  x: frame.x,
  y: frame.y,
});

const toReusedMap = (input: BoardInput): Map<string, CanvasFileFrame> => {
  const reused = new Map<string, CanvasFileFrame>();
  const taken = new Set<string>();

  for (const state of input.states) {
    const frame = toReusedFrame(input, state, taken);

    if (frame !== null) {
      reused.set(state.id, frame);
      taken.add(frame.id);
    }
  }

  return reused;
};

const toStart = (
  input: BoardInput,
  reused: readonly CanvasFileFrame[],
  fresh: number
): BoardPoint => {
  if (reused.length > 0) {
    return {
      x: Math.max(...reused.map((frame) => frame.x + frame.width)) + input.gap,
      y: Math.min(...reused.map((frame) => frame.y)),
    };
  }

  const rowWidth = fresh * (input.source.width + input.gap);

  return { x: input.source.x, y: toRowTop(input, rowWidth) };
};

const toBoardSlots = (input: BoardInput): readonly BoardSlot[] => {
  const page = toPageOf(input.source);
  const reused = toReusedMap(input);
  const fresh = input.states.filter((state) => !reused.has(state.id)).length;
  const start = toStart(input, [...reused.values()], fresh);
  const step = input.source.width + input.gap;
  let column = 0;

  return input.states.map((state) => {
    const frame = reused.get(state.id);

    if (frame) {
      return toReusedSlot(frame, state, page);
    }

    const left = toClamped(start.x + column * step);

    column += 1;

    return {
      frameId: null,
      height: input.source.height,
      label: toBoardLabel(state, page),
      state: state.id,
      width: input.source.width,
      x: left,
      y: toClamped(start.y),
    };
  });
};

const toFittedBox = (boxes: readonly BoardBox[]): BoardBox | null => {
  if (boxes.length === 0) {
    return null;
  }

  const left = Math.min(...boxes.map((box) => box.x)) - SECTION_PAD_SIDE;

  const top = Math.min(...boxes.map((box) => box.y)) - SECTION_PAD_TOP;

  const right =
    Math.max(...boxes.map((box) => box.x + box.width)) + SECTION_PAD_SIDE;

  const bottom =
    Math.max(...boxes.map((box) => box.y + box.height)) + SECTION_PAD_SIDE;

  return {
    height: Math.round(bottom - top),
    width: Math.round(right - left),
    x: toClamped(left),
    y: toClamped(top),
  };
};

const toJoinedBox = (first: BoardBox, second: BoardBox): BoardBox => {
  const left = Math.min(first.x, second.x);

  const top = Math.min(first.y, second.y);

  const right = Math.max(first.x + first.width, second.x + second.width);

  const bottom = Math.max(first.y + first.height, second.y + second.height);

  return { height: bottom - top, width: right - left, x: left, y: top };
};

const toBoardSections = (
  sections: readonly CanvasSection[],
  page: string,
  boxes: readonly BoardBox[]
): CanvasSection[] => {
  const label = toSectionLabel(page);
  const box = toFittedBox(boxes);
  const previous = sections.find((item) => item.label === label);

  if (box === null) {
    return [...sections];
  }

  if (previous) {
    const joined = toJoinedBox(previous, box);

    return sections.map((item) => {
      if (item.id === previous.id) {
        return { ...item, ...joined };
      }

      return item;
    });
  }

  if (sections.length >= CANVAS_MAX_SECTIONS) {
    return [...sections];
  }

  return [...sections, { ...box, id: nextSectionId(sections), label }];
};

export { toBoardLabel, toBoardSections, toBoardSlots, toPageOf };

export type { BoardBox, BoardInput, BoardSlot, BoardState };
