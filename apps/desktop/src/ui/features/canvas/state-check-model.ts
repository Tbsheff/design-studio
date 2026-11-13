import type { WireOutput } from "@design-studio/actions/_core/action";
import type { inspectStateFramesCanvas } from "@design-studio/actions/canvas/inspect-state-frames";
import type { CanvasSection } from "@design-studio/contracts/canvas-file";

import type { CanvasFrame } from "./canvas-layout-types.js";
import { stateCheckCopy } from "./copy.js";

type StateCheckWire = WireOutput<typeof inspectStateFramesCanvas>;

type StateCheckRow = StateCheckWire["items"][number];

interface StateCheckView {
  readonly line: string;
  readonly prompt: string | null;
  readonly targetId: string | null;
}

const DEFAULT_STATE = "default";

const BOARD_PREFIX = "/";

const BOARD_SUFFIX = " states";

const HALF = 2;

const isStateBoardSection = (section: CanvasSection): boolean =>
  section.label.startsWith(BOARD_PREFIX) &&
  section.label.endsWith(BOARD_SUFFIX);

const isInSection = (frame: CanvasFrame, section: CanvasSection): boolean => {
  const midX = frame.x + frame.width / HALF;
  const midY = frame.y + frame.height / HALF;

  return (
    midX >= section.x &&
    midX <= section.x + section.width &&
    midY >= section.y &&
    midY <= section.y + section.height
  );
};

const toBoardFrameId = (
  frames: readonly CanvasFrame[],
  section: CanvasSection
): string | null =>
  frames.find((frame) => frame.hidden !== true && isInSection(frame, section))
    ?.id ?? null;

const toSameRows = (rows: readonly StateCheckRow[]): StateCheckRow[] =>
  rows.filter((row) => row.state !== DEFAULT_STATE && row.isSameAsDefault);

const toStateCount = (rows: readonly StateCheckRow[]): number =>
  rows.filter((row) => row.state !== DEFAULT_STATE).length;

const toNameList = (rows: readonly StateCheckRow[]): string => {
  const names = rows.map((row) => row.stateName);

  if (names.length < HALF) {
    return names.join("");
  }

  return `${names.slice(0, -1).join(", ")}${stateCheckCopy.promptJoin}${names.at(-1) ?? ""}`;
};

const toLine = (same: number, total: number): string => {
  if (same === 0) {
    return stateCheckCopy.noneLike;
  }

  let tail: string = stateCheckCopy.lookLike;

  if (same === 1) {
    tail = stateCheckCopy.looksLike;
  }

  return `${same}${stateCheckCopy.of}${total}${stateCheckCopy.states}${tail}`;
};

const toDesignPrompt = (page: string, same: readonly StateCheckRow[]): string =>
  `${stateCheckCopy.promptStart}${toNameList(same)}${stateCheckCopy.promptOf}/${page}${stateCheckCopy.promptEnd}`;

const toStateCheckView = (wire: StateCheckWire | null): StateCheckView => {
  if (wire === null) {
    return { line: stateCheckCopy.checking, prompt: null, targetId: null };
  }

  const same = toSameRows(wire.items);
  const line = toLine(same.length, toStateCount(wire.items));
  const [first] = same;

  if (!first) {
    return { line, prompt: null, targetId: null };
  }

  return {
    line: `${line}: ${toNameList(same)}`,
    prompt: toDesignPrompt(wire.page, same),
    targetId: first.frameId,
  };
};

export { isStateBoardSection, toBoardFrameId, toStateCheckView };

export type { StateCheckRow, StateCheckView, StateCheckWire };
