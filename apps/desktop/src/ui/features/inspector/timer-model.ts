import type { MutableRefObject } from "react";

type TimerRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;

const stopTimer = (timer: TimerRef): void => {
  if (timer.current === null) {
    return;
  }

  globalThis.clearTimeout(timer.current);
  timer.current = null;
};

export { stopTimer };

export type { TimerRef };
