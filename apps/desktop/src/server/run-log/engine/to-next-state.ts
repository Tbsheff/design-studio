import type { StateRunItem } from "@design-studio/actions/run/states/schema";
import type {
  CanvasFileFrame,
  CanvasSection,
} from "@design-studio/contracts/canvas-file";

interface StateCheckRow {
  readonly frameId: string;
  readonly isSameAsDefault: boolean;
  readonly state: string;
  readonly stateName: string;
}

type RunEndStatus = "done" | "failed" | "stopped";

const DEFAULT_STATE = "default";

const BOARD_PREFIX = "/";

const BOARD_SUFFIX = " states";

const SEQUENCE_PREFIX = "states-";

const HALF = 2;

const COMPLETED = "completed";

const CANCELED = "canceled";

const PROMPT_START = "Design the ";

const PROMPT_OF = " state of ";

const PROMPT_END = ". Change only the code for this state.";

const isStateBoardSection = (section: CanvasSection): boolean =>
  section.label.startsWith(BOARD_PREFIX) &&
  section.label.endsWith(BOARD_SUFFIX);

const isInSection = (
  frame: CanvasFileFrame,
  section: CanvasSection
): boolean => {
  const midX = frame.x + frame.width / HALF;
  const midY = frame.y + frame.height / HALF;

  return (
    midX >= section.x &&
    midX <= section.x + section.width &&
    midY >= section.y &&
    midY <= section.y + section.height
  );
};

const toSectionFrame = (
  frames: readonly CanvasFileFrame[],
  section: CanvasSection
): CanvasFileFrame | null =>
  frames.find(
    (frame) => frame.hidden !== true && isInSection(frame, section)
  ) ?? null;

const toSequenceId = (section: string): string =>
  `${SEQUENCE_PREFIX}${section}`;

const toStateRunItems = (rows: readonly StateCheckRow[]): StateRunItem[] =>
  rows.flatMap((row): StateRunItem[] => {
    if (row.state === DEFAULT_STATE || !row.isSameAsDefault) {
      return [];
    }

    return [
      {
        frameId: row.frameId,
        runId: null,
        state: row.state,
        stateName: row.stateName,
        status: "waiting",
      },
    ];
  });

const toRunEndStatus = (status: string): RunEndStatus => {
  if (status === COMPLETED) {
    return "done";
  }

  if (status === CANCELED) {
    return "stopped";
  }

  return "failed";
};

const toItemPatch = (
  items: readonly StateRunItem[],
  index: number,
  patch: Partial<StateRunItem>
): StateRunItem[] =>
  items.map((item, at): StateRunItem => {
    if (at !== index) {
      return item;
    }

    return { ...item, ...patch };
  });

const toStoppedRest = (items: readonly StateRunItem[]): StateRunItem[] =>
  items.map((item): StateRunItem => {
    if (item.status !== "waiting") {
      return item;
    }

    return { ...item, status: "stopped" };
  });

const isSequenceActive = (items: readonly StateRunItem[]): boolean =>
  items.some((item) => item.status === "waiting" || item.status === "running");

const toNextStateIndex = (
  items: readonly StateRunItem[],
  after: number
): number | null => {
  const next = items.findIndex(
    (item, at) => at > after && item.status === "waiting"
  );

  if (next === -1) {
    return null;
  }

  return next;
};

const toStateRunPrompt = (page: string, stateName: string): string =>
  `${PROMPT_START}${stateName}${PROMPT_OF}/${page}${PROMPT_END}`;

export {
  isSequenceActive,
  isStateBoardSection,
  toItemPatch,
  toNextStateIndex,
  toRunEndStatus,
  toSectionFrame,
  toSequenceId,
  toStateRunItems,
  toStateRunPrompt,
  toStoppedRest,
};

export type { RunEndStatus, StateCheckRow };
