import { useState } from "react";

import { DEFAULT_GAP, toLastGap } from "./auto-layout-model.js";

const useLastGap = (gap: string): string => {
  const [last, setLast] = useState(() => toLastGap(gap, DEFAULT_GAP));
  const next = toLastGap(gap, last);

  if (next !== last) {
    setLast(next);
  }

  return next;
};

export { useLastGap };
