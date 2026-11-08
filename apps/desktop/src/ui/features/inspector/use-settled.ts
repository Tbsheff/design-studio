import { useEffect, useState } from "react";

const useSettled = <Settled>(value: Settled, ms: number): Settled => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => setSettled(value), ms);

    return (): void => globalThis.clearTimeout(timer);
  }, [value, ms]);

  return settled;
};

export { useSettled };
