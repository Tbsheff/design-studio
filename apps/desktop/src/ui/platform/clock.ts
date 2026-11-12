import { useEffect, useState } from "react";

const isPageHidden = (): boolean => document.visibilityState === "hidden";

const useNow = (isOn: boolean, stepMs: number): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOn) {
      return;
    }

    let timer: ReturnType<typeof globalThis.setInterval> | null = null;

    const stopTick = (): void => {
      if (timer !== null) {
        globalThis.clearInterval(timer);
        timer = null;
      }
    };

    const startTick = (): void => {
      stopTick();

      if (!isPageHidden()) {
        timer = globalThis.setInterval(() => setNow(Date.now()), stepMs);
      }
    };

    const onVisibility = (): void => {
      if (!isPageHidden()) {
        setNow(Date.now());
      }

      startTick();
    };

    startTick();
    document.addEventListener("visibilitychange", onVisibility);

    return (): void => {
      stopTick();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isOn, stepMs]);

  return now;
};

export { useNow };
