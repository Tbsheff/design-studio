import type {
  Project,
  RunLevel,
  SelectionContext,
} from "@design-studio/contracts";
import {
  TRY_VARIANTS_COMMAND,
  elementVariantsBlocker,
} from "@design-studio/contracts/element-variants";

import { useCommands } from "../../canvas-hook-slots.js";
import type { VariationsState } from "./use-variations.js";

const useTryVariants = (
  project: Project | null,
  selection: SelectionContext[],
  variations: VariationsState
): ((prompt: string, count: number, level: RunLevel) => Promise<void>) => {
  const blocker = project
    ? elementVariantsBlocker(project, selection)
    : "Wait for the design to load";

  useCommands(() => [
    {
      group: "Selection",
      icon: "compare",
      id: TRY_VARIANTS_COMMAND,
      keywords: "try versions options alternatives element",
      run: () => {
        if (selection[0]) {
          variations.askElement(selection[0]);
        }
      },
      slash: "variants",
      title: "Try variants of the selected element",
      ...(blocker ? { disabled: blocker } : {}),
    },
  ]);

  return async (
    prompt: string,
    count: number,
    level: RunLevel
  ): Promise<void> => {
    const element = selection[0];

    if (blocker || !element) {
      throw new Error(blocker ?? "Select one element first");
    }

    await variations.proposeElement(element, prompt, count, level);
  };
};

export { useTryVariants };
