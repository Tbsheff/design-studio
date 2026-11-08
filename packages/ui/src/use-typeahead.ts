import { useCallback, useRef } from "react";

import { pick } from "./pick.js";
import { TYPEAHEAD_RESET_MS, toTypeahead } from "./ui-select-model.js";
import type { UiSelectOption } from "./ui-select-model.js";

const useTypeahead = (
  options: readonly UiSelectOption[],
  active: number
): ((key: string) => number) => {
  const typed = useRef({ at: 0, text: "" });

  return useCallback(
    (key: string): number => {
      const now = Date.now();
      const isFresh = now - typed.current.at < TYPEAHEAD_RESET_MS;
      const text = `${pick(isFresh, typed.current.text, "")}${key}`;
      typed.current = { at: now, text };
      const from = pick(text.length > 1, active - 1, active);

      return toTypeahead(options, from, text);
    },
    [options, active]
  );
};

export { useTypeahead };
