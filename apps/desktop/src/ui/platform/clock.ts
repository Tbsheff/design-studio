import { useEffect, useState } from "react";

const useNow = (isOn: boolean, stepMs: number): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOn) {
      return;
    }

    const timer = globalThis.setInterval(() => setNow(Date.now()), stepMs);

    return (): void => globalThis.clearInterval(timer);
  }, [isOn, stepMs]);

  return now;
};

export { useNow };
