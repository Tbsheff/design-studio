import { useMemo } from "react";

import { toColorUi } from "./use-shadow-row.js";
import { useTokenUi } from "./use-token-snap.js";
import type { TokenUi } from "./use-token-snap.js";

const useShadowColorUi = (): TokenUi | null => {
  const ui = useTokenUi();

  return useMemo(() => toColorUi(ui), [ui]);
};

export { useShadowColorUi };
