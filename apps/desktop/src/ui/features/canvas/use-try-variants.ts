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

type CommandEntry = ReturnType<Parameters<typeof useCommands>[0]>[number];

const useTryVariants = (
  project: Project | null,
  selection: SelectionContext[],
  variations: VariationsState
): ((prompt: string, count: number, level: RunLevel) => Promise<void>) => {
  let blocker: string | null = "Wait for the design to load";

  if (project) {
    blocker = elementVariantsBlocker(project, selection);
  }

  useCommands(() => {
    const command: CommandEntry = {
      group: "Selection",
      icon: "compare",
      id: TRY_VARIANTS_COMMAND,
      keywords: "try versions options alternatives element",
      run: (): void => {
        if (selection[0]) {
          variations.askElement(selection[0]);
        }
      },
      slash: "variations",
      title: "Make variations of the selected layer",
    };

    if (blocker) {
      return [{ ...command, disabled: blocker }];
    }

    return [command];
  });

  return async (
    prompt: string,
    count: number,
    level: RunLevel
  ): Promise<void> => {
    const [element] = selection;

    if (blocker || !element) {
      throw new Error(blocker ?? "Select one element first");
    }

    await variations.proposeElement(element, prompt, count, level);
  };
};

export { useTryVariants };
