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

const RUN_0 = 0;

const ELEMENT_0 = 0;

const useTryVariants = (
  project: Project | null,
  selection: SelectionContext[],
  variations: VariationsState
): ((prompt: string, count: number, level: RunLevel) => Promise<void>) => {
  let blocker: string | null = "Wait for the design to load";

  if (project) {
    blocker = elementVariantsBlocker(project, selection);
  }

  useCommands(() => [
    {
      group: "Selection",
      icon: "compare",
      id: TRY_VARIANTS_COMMAND,
      keywords: "try versions options alternatives element",
      run: () => {
        if (selection[RUN_0]) {
          variations.askElement(selection[RUN_0]);
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
    const element = selection[ELEMENT_0];

    if (blocker || !element) {
      throw new Error(blocker ?? "Select one element first");
    }

    await variations.proposeElement(element, prompt, count, level);
  };
};

export { useTryVariants };
