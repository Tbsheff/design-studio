import { cleanClock } from "@design-studio/contracts/frame-state";
import type { FrameStateDef } from "@design-studio/contracts/frame-state";

import { BadRequestError } from "../platform/errors/index.js";

const CLOCK_ERROR = "clock must be an ISO date-time such as 2026-03-03T09:00";

interface ClockFields {
  readonly clock: string | null;
  readonly isClockFrozen: boolean;
}

interface ClockAsk {
  readonly clock?: string | null;
  readonly isClockFrozen?: boolean;
}

const toNextClock = (
  existing: FrameStateDef | undefined,
  asked: ClockAsk
): string | null => {
  let clock = existing?.clock ?? null;

  if ("clock" in asked) {
    clock = asked.clock ?? null;
  }

  if (clock !== null && cleanClock(clock) === null) {
    throw new BadRequestError(CLOCK_ERROR);
  }

  return clock;
};

const toNextClockFields = (
  existing: FrameStateDef | undefined,
  asked: ClockAsk
): ClockFields => ({
  clock: toNextClock(existing, asked),
  isClockFrozen: asked.isClockFrozen ?? existing?.isClockFrozen ?? false,
});

const toClockLine = (state: FrameStateDef): string => {
  if (!state.clock) {
    return "";
  }

  if (state.isClockFrozen) {
    return ` Clock ${state.clock} frozen.`;
  }

  return ` Clock ${state.clock} running.`;
};

export { toClockLine, toNextClockFields };
