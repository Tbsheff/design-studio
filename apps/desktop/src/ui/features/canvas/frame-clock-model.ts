import type { FrameStateDef } from "@design-studio/contracts/frame-state";

const CLOCK_STATE_NAME = "Fixed clock";

const CLOCK_INPUT_LENGTH = 16;

const toClockValue = (def: FrameStateDef | null): string =>
  def?.clock?.slice(0, CLOCK_INPUT_LENGTH) ?? "";

const isClockFrozen = (def: FrameStateDef | null): boolean =>
  def?.isClockFrozen ?? true;

const hasClock = (def: FrameStateDef | null): boolean =>
  (def?.clock ?? "") !== "";

export { CLOCK_STATE_NAME, hasClock, isClockFrozen, toClockValue };
