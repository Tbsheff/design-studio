import type { SelectionContext } from "@design-studio/contracts";

import { imageKindOf } from "../../../shared/image.js";
import type { InspectorProps } from "./inspector-model.js";

const isImageOutside = (
  props: InspectorProps,
  reason: string | null,
  target: SelectionContext | null
): boolean => {
  if (!reason || !target || !props.isEditable) {
    return false;
  }

  return props.selection.length === 1 && Boolean(imageKindOf(target));
};

const toSelectionKey = (selection: SelectionContext[]): string =>
  selection.map((context) => context.selector).join("\n");

const toEditorKey = (
  target: SelectionContext,
  variant: string,
  isEditingUse: boolean
): string => {
  if (isEditingUse) {
    return `${target.selector}|${variant}|use`;
  }

  return `${target.selector}|${variant}`;
};

export { isImageOutside, toEditorKey, toSelectionKey };
