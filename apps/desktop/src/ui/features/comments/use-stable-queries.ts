import { useState } from "react";

import { anchorQueryOf } from "./deps.js";
import type { AnchorQuery, DesignComment } from "./deps.js";

const useStableQueries = (tracked: DesignComment[]): AnchorQuery[] => {
  const queries = tracked.map((comment) => anchorQueryOf(comment));
  const key = JSON.stringify(queries);
  const [stable, setStable] = useState(queries);
  const [stableKey, setStableKey] = useState(key);

  if (stableKey !== key) {
    setStableKey(key);
    setStable(queries);
  }

  return stable;
};

export { useStableQueries };
