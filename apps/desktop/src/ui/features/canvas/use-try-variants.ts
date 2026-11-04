import type {
  Project,
  RunLevel,
  SelectionContext,
} from "@design-studio/actions/_core/contracts";
import {
  TRY_VARIANTS_COMMAND,
  elementVariantsBlocker,
} from "@design-studio/actions/_core/element-variants";
import { useCommands } from "../../canvas-hook-slots.js";
import type { VariationsState } from "./use-variations.js";

export function useTryVariants(
  project: Project | null,
  selection: SelectionContext[],
  variations: VariationsState
) {
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

  return async (prompt: string, count: number, level: RunLevel) => {
    const element = selection[0];

    if (blocker || !element) {
      throw new Error(blocker ?? "Select one element first");
    }

    await variations.proposeElement(element, prompt, count, level);
  };
}
