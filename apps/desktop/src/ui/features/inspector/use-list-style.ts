import type {
  DirectEditRequest,
  SelectionContext,
} from "@design-studio/contracts";
import { startTransition, useCallback, useMemo, useState } from "react";

import { api, errorText } from "../../api.js";
import type { StyleValues } from "./css-value-model.js";
import type { DirectEdit } from "./deps.js";
import { toEditTarget } from "./edit-request-model.js";
import type { ElementClasses } from "./element-classes-model.js";
import {
  isListItem,
  isListLayer,
  isParentEditable,
  toListStyle,
  toOtherPosition,
  toParentTarget,
  toPositionClassChange,
  toPositionStyleChange,
  toTypeClassChange,
  toTypeStyleChange,
} from "./list-style-model.js";
import type {
  ListClassChange,
  ListStyle,
  ListType,
} from "./list-style-model.js";
import { applyEdit } from "./simple-model.js";

interface ListStyleControls {
  readonly error: string | null;
  readonly isReadOnly: boolean;
  readonly isReady: boolean;
  readonly isShown: boolean;
  readonly onPickType: (type: ListType) => void;
  readonly onToggleInside: () => void;
  readonly style: ListStyle;
}

interface ListChange {
  readonly classes: ListClassChange;
  readonly style: Partial<StyleValues>;
}

const toTailwindClasses = (
  classes: ElementClasses | null
): readonly string[] | null => {
  if (
    classes?.variants?.mode === "classes" &&
    classes.tailwind?.mode === "classes"
  ) {
    return classes.tailwind.classes;
  }

  return null;
};

const toRequestTarget = (
  selection: SelectionContext
): DirectEditRequest | null => {
  if (isListItem(selection)) {
    return toParentTarget(selection);
  }

  if (!selection.source) {
    return null;
  }

  return {
    selector: selection.selector,
    source: selection.source,
    ...toEditTarget(selection),
  };
};

const applyClassChange = async (
  edit: DirectEdit,
  selection: SelectionContext,
  classes: ListClassChange
): Promise<void> => {
  const { directionId, projectId } = edit.scope;
  const target = toRequestTarget(selection);

  if (target === null || !directionId) {
    return;
  }

  await api.directEdit(projectId, directionId, { ...target, classes });
  edit.absorb({});
  edit.reselect();
};

const useListStyle = (
  edit: DirectEdit,
  selection: SelectionContext | null,
  classes: ElementClasses | null
): ListStyleControls => {
  const [message, setMessage] = useState<string | null>(null);
  const tailwind = toTailwindClasses(classes);
  const isReady = classes === null || classes.variants !== null;

  const isReadOnly =
    isListItem(selection) && !isParentEditable(selection, tailwind);

  const isShown = isListLayer(selection, tailwind);

  const style = useMemo(
    () => toListStyle(edit.values, tailwind),
    [edit.values, tailwind]
  );

  const write = useCallback(
    (change: ListChange) => {
      setMessage(null);

      if (tailwind === null) {
        applyEdit(edit, change.style);

        return;
      }

      if (!selection) {
        return;
      }

      startTransition(async () => {
        try {
          await applyClassChange(edit, selection, change.classes);
        } catch (error) {
          setMessage(errorText(error));
        }
      });
    },
    [edit, selection, tailwind]
  );

  const onPickType = useCallback(
    (type: ListType) => {
      if (type !== style.type) {
        write({
          classes: toTypeClassChange(type),
          style: toTypeStyleChange(type),
        });
      }
    },
    [style.type, write]
  );

  const onToggleInside = useCallback(() => {
    const next = toOtherPosition(style.position);

    write({
      classes: toPositionClassChange(next),
      style: toPositionStyleChange(next),
    });
  }, [style.position, write]);

  return {
    error: message,
    isReadOnly,
    isReady,
    isShown,
    onPickType,
    onToggleInside,
    style,
  };
};

export { useListStyle };

export type { ListStyleControls };
