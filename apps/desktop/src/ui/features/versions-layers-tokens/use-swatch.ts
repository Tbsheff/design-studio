import type { CompiledTokenEntry } from "@design-studio/contracts";
import { useCallback } from "react";

import { toSwatch } from "./tokens-panel-model.js";

const useSwatch = (
  entries: CompiledTokenEntry[]
): ((value: string, isDark: boolean) => string) =>
  useCallback(
    (value: string, isDark: boolean): string =>
      toSwatch(value, isDark, entries),
    [entries]
  );

export { useSwatch };
