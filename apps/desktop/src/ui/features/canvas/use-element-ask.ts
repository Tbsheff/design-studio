import type { Project, SelectionContext } from "@design-studio/contracts";
import { useCallback } from "react";

import type { VariationsState } from "./use-variations.js";

interface ElementAsk {
  readonly onCancel: () => void;
  readonly onStart: (note: string, count: number) => Promise<void>;
}

const useElementAsk = (
  state: VariationsState,
  project: Project,
  element: SelectionContext | null
): ElementAsk => {
  const { askElement, proposeElement } = state;
  const { defaultLevel } = project.settings;

  const onCancel = useCallback((): void => askElement(null), [askElement]);

  const onStart = useCallback(
    async (note: string, count: number): Promise<void> => {
      if (element) {
        await proposeElement(element, note, count, defaultLevel);
      }
    },
    [proposeElement, element, defaultLevel]
  );

  return { onCancel, onStart };
};

export { useElementAsk };
