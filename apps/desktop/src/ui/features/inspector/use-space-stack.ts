import type { SelectionContext } from "@design-studio/contracts";
import { useMemo } from "react";

import type { ElementClasses } from "./element-classes-model.js";
import { isFlexDisplay, isGridDisplay } from "./sizing-model.js";
import { toSpaceStack, toStackValues } from "./space-stack-model.js";
import type { SpaceStack } from "./space-stack-model.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface SpaceStackView {
  readonly stack: SpaceStack | null;
  readonly stackEdit: DirectEdit | null;
}

const toTailwindClasses = (
  classes: ElementClasses | null
): readonly string[] | null => {
  if (classes?.tailwind?.mode === "classes") {
    return classes.tailwind.classes;
  }

  return null;
};

const toLayoutStack = (
  edit: DirectEdit,
  classes: ElementClasses | null,
  styles: Readonly<Record<string, string>> | null
): SpaceStack | null => {
  const { display } = edit.values;

  if (isFlexDisplay(display) || isGridDisplay(display)) {
    return null;
  }

  return toSpaceStack(toTailwindClasses(classes), {
    x: styles?.["stack-gap-x"] ?? null,
    y: styles?.["stack-gap-y"] ?? null,
  });
};

const toStackEdit = (
  edit: DirectEdit,
  stack: SpaceStack | null
): DirectEdit | null => {
  if (stack === null || !stack.isEditable) {
    return null;
  }

  return {
    ...edit,
    preview: edit.previewForced,
    values: toStackValues(edit.values, stack),
  };
};

const useSpaceStack = (
  edit: DirectEdit,
  classes: ElementClasses | null,
  selection: SelectionContext | null
): SpaceStackView => {
  const styles = selection?.styles ?? null;

  const stack = useMemo(
    () => toLayoutStack(edit, classes, styles),
    [edit, classes, styles]
  );

  const stackEdit = useMemo(() => toStackEdit(edit, stack), [edit, stack]);

  return { stack, stackEdit };
};

export { useSpaceStack };

export type { SpaceStackView };
