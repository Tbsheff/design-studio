import type { SelectionContext } from "@design-studio/contracts";
import { startTransition, useCallback } from "react";

import type { FlipAxis } from "../../../shared/flip.js";
import { api } from "../../api.js";
import type { StyleValues } from "./css-value-model.js";
import { createEditRequest } from "./edit-request-model.js";
import { toFlippedScale } from "./flip-model.js";
import type { OwnEdit } from "./mixed-values-model.js";
import { startOptimistic } from "./optimistic-edit-model.js";
import type { EditorProps, MultiEdit } from "./simple-model.js";
import { toFailureText } from "./use-direct-edit-core.js";
import { editVariantStore } from "./use-edit-variant.js";
import { useRotationState } from "./use-rotation.js";
import type { Rotation } from "./use-rotation.js";

const toFlipItems = (
  selections: readonly SelectionContext[],
  bases: readonly StyleValues[],
  axis: FlipAxis
): OwnEdit[] =>
  selections.flatMap((selection, index) => {
    const scale = bases[index]?.scale ?? "";
    const style = { scale: toFlippedScale(scale, axis) };
    const variant = editVariantStore.get();
    const edit = createEditRequest(selection, style, null, variant);

    if (edit === null) {
      return [];
    }

    return [{ edit, style }];
  });

const runNoProblem = (): null => null;

const applyFlip = async (
  props: EditorProps,
  directionId: string,
  items: readonly OwnEdit[]
): Promise<void> => {
  const edits = items.map((item) => item.edit);

  const optimistic = edits.map((edit) =>
    startOptimistic(props.port.current, edit, runNoProblem)
  );

  try {
    const result = await api.directEditBatch(props.projectId, directionId, {
      edits,
    });

    for (const [index, one] of optimistic.entries()) {
      one.saved(result.applied[index]?.tailwind ?? null);
    }

    for (const item of items) {
      props.onCommitted({ selector: item.edit.selector, style: item.style });
    }
  } catch (error) {
    for (const one of optimistic) {
      one.failed(toFailureText(error as Error));
    }
  }
};

const useMultiRotation = (props: EditorProps, edit: MultiEdit): Rotation => {
  const { directionId, selection } = props;

  const flip = useCallback(
    (axis: FlipAxis): void => {
      if (edit.blocked !== null || directionId === null) {
        return;
      }

      const items = toFlipItems(selection, edit.each ?? [], axis);

      if (items.length === 0) {
        return;
      }

      startTransition(async () => {
        await applyFlip(props, directionId, items);
      });
    },
    [edit, directionId, selection, props]
  );

  return useRotationState(edit, flip);
};

export { useMultiRotation };
