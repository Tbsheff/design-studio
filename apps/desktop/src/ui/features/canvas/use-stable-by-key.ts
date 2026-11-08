import { useState } from "react";

interface Held<Value> {
  readonly key: string;
  readonly value: Value;
}

const useStableByKey = <Value>(value: Value, key: string): Value => {
  const [held, setHeld] = useState<Held<Value>>({ key, value });

  if (held.key !== key) {
    setHeld({ key, value });

    return value;
  }

  return held.value;
};

export { useStableByKey };
