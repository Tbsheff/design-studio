import { useState } from "react";

const useMorph = (key: string): boolean => {
  const [lastKey, setLastKey] = useState(key);
  const [hasMorphed, setHasMorphed] = useState(false);

  if (lastKey !== key) {
    setLastKey(key);
    setHasMorphed(true);
  }

  return hasMorphed;
};

export { useMorph };
