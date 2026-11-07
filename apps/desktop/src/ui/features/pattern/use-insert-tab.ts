import { useCallback, useState } from "react";

import type { InsertTab } from "./pattern-model.js";

interface InsertTabState {
  readonly select: (tab: InsertTab) => void;
  readonly tab: InsertTab;
}

const useInsertTab = (): InsertTabState => {
  const [tab, setTab] = useState<InsertTab>("components");
  const select = useCallback((next: InsertTab): void => setTab(next), []);

  return { select, tab };
};

export { useInsertTab };

export type { InsertTabState };
