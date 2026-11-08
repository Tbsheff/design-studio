import { useState } from "react";

const useStableValue = <Value>(value: Value, key: string): Value => {
  const [held, setHeld] = useState({ key, value });

  if (held.key !== key) {
    setHeld({ key, value });

    return value;
  }

  return held.value;
};

export { useStableValue };
