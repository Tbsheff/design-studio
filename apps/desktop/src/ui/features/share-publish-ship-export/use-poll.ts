import { useEffect } from "react";

const usePoll = (
  isActive: boolean,
  task: () => Promise<void>,
  delayMs: number
): void => {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    let live = true;
    let timer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const tick = async (): Promise<void> => {
      await task();

      if (live) {
        timer = globalThis.setTimeout(tick, delayMs);
      }
    };

    timer = globalThis.setTimeout(tick, delayMs);

    return (): void => {
      live = false;

      if (timer !== null) {
        globalThis.clearTimeout(timer);
      }
    };
  }, [isActive, task, delayMs]);
};

export { usePoll };
