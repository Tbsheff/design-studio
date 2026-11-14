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
  classes: ElementClasses | null
): SpaceStack | null => {
  const { display } = edit.values;

  if (isFlexDisplay(display) || isGridDisplay(display)) {
    return null;
  }

  return toSpaceStack(toTailwindClasses(classes));
};

const toStackEdit = (
  edit: DirectEdit,
  stack: SpaceStack | null
): DirectEdit | null => {
  if (stack === null || !stack.isEditable) {
    return null;
  }

  return { ...edit, values: toStackValues(edit.values, stack) };
};

const useSpaceStack = (
  edit: DirectEdit,
  classes: ElementClasses | null
): SpaceStackView => {
  const stack = useMemo(() => toLayoutStack(edit, classes), [edit, classes]);
  const stackEdit = useMemo(() => toStackEdit(edit, stack), [edit, stack]);

  return { stack, stackEdit };
};

export { useSpaceStack };

export type { SpaceStackView };
