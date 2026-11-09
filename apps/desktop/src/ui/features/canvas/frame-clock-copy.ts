import { CLOCK_LIMIT_NOTE } from "@design-studio/contracts/frame-state";

const clockCopy = {
  clear: "Clear",
  clearTip: "Show real dates again",
  clock: "Clock",
  clockTip: CLOCK_LIMIT_NOTE,
  frozen: "Frozen",
  frozenTip: "On: the time stops at the date. Off: the time ticks from it.",
  limit: CLOCK_LIMIT_NOTE,
  pickDate: "Date and time for the clock of this frame",
} as const;

export { clockCopy };
