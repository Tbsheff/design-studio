import type {
  DirectEditRequest,
  SelectionContext,
} from "@design-studio/contracts";
import { startTransition, useCallback, useMemo, useState } from "react";

import { api, errorText } from "../../api.js";
import type { StyleValues } from "./css-value-model.js";
import type { DirectEdit } from "./deps.js";
import { createEditRequest, toEditTarget } from "./edit-request-model.js";
import type { ElementClasses } from "./element-classes-model.js";
import {
  hasOutline,
  isStrokePosition,
  toCenterPatch,
  toChangedStyle,
  toKeptPlacePatch,
  toNoOutline,
  toPositionPatch,
  toRingColorClass,
  toRingRemoval,
  toRingStroke,
  toRingWidthClass,
  toStrokeLook,
  toStrokePosition,
} from "./stroke-position-model.js";
import type {
  ClassChange,
  RingStroke,
  StrokePosition,
} from "./stroke-position-model.js";
import { useEditVariant } from "./use-edit-variant.js";

interface StrokePositionControls {
  readonly error: string | null;
  readonly handlePositionPick: (next: string) => void;
  readonly handleRemove: () => void;
  readonly handleRingColor: (color: string) => void;
  readonly handleRingWidth: (width: number) => void;
  readonly hasStroke: boolean;
  readonly outlineEdit: DirectEdit;
  readonly position: StrokePosition;
  readonly ring: RingStroke | null;
}

interface ClassWrite {
  readonly classes: ClassChange;
  readonly style: Partial<StyleValues>;
}

const NO_STYLES: Readonly<Record<string, string>> = {};

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

const toCenterEdit = (edit: DirectEdit): DirectEdit => ({
  ...edit,
  preview: (patch) => edit.preview(toCenterPatch(patch)),
  previewForced: (patch) => edit.previewForced(toCenterPatch(patch)),
});

const toOutlineEdit = (
  edit: DirectEdit,
  position: StrokePosition
): DirectEdit => {
  if (position === "center") {
    return toCenterEdit(edit);
  }

  return edit;
};

const toClassRequest = (
  selection: SelectionContext | null,
  write: ClassWrite,
  variant: string
): DirectEditRequest | null => {
  const source = selection?.source;

  if (!selection || !source) {
    return null;
  }

  const base = createEditRequest(selection, write.style, null, variant) ?? {
    selector: selection.selector,
    source,
    ...toEditTarget(selection),
  };

  if (variant === "") {
    return { ...base, classes: write.classes };
  }

  return { ...base, classes: write.classes, variant };
};

const useClassWrite = (
  edit: DirectEdit,
  selection: SelectionContext | null,
  setMessage: (message: string | null) => void
): ((write: ClassWrite) => void) => {
  const { directionId, projectId } = edit.scope;
  const variant = useEditVariant();

  return useCallback(
    (write: ClassWrite) => {
      const request = toClassRequest(selection, write, variant);

      if (!request || !directionId) {
        return;
      }

      setMessage(null);
      startTransition(async () => {
        try {
          await api.directEdit(projectId, directionId, request);
          edit.absorb(write.style);
          edit.reselect();
        } catch (error) {
          setMessage(errorText(error));
        }
      });
    },
    [directionId, edit, projectId, selection, setMessage, variant]
  );
};

interface RingWrites {
  readonly handleRingColor: (color: string) => void;
  readonly handleRingWidth: (width: number) => void;
}

const useRingWrites = (
  writeClasses: (write: ClassWrite) => void,
  variant: string
): RingWrites => {
  const handleRingWidth = useCallback(
    (width: number) => {
      writeClasses({
        classes: { add: [`${variant}${toRingWidthClass(width)}`], remove: [] },
        style: {},
      });
    },
    [variant, writeClasses]
  );

  const handleRingColor = useCallback(
    (color: string) => {
      writeClasses({
        classes: { add: [`${variant}${toRingColorClass(color)}`], remove: [] },
        style: {},
      });
    },
    [variant, writeClasses]
  );

  return { handleRingColor, handleRingWidth };
};

interface PickState {
  readonly edit: DirectEdit;
  readonly isTailwind: boolean;
  readonly position: StrokePosition;
  readonly ring: RingStroke | null;
  readonly writeClasses: (write: ClassWrite) => void;
}

const applyPositionPick = (state: PickState, next: string): void => {
  const { edit, isTailwind, position, ring, writeClasses } = state;

  if (!isStrokePosition(next) || next === position) {
    return;
  }

  const look = toStrokeLook(position, edit.values, ring, edit.dirty);
  const patch = toPositionPatch(next, look, isTailwind);

  if (ring) {
    writeClasses({
      classes: toRingRemoval(ring),
      style: toChangedStyle(patch, edit.values),
    });

    return;
  }

  edit.previewForced(
    toKeptPlacePatch(patch, edit.values, { next, position, width: look.width })
  );
  edit.commit();
};

const useStrokePosition = (
  edit: DirectEdit,
  selection: SelectionContext | null,
  classes: ElementClasses | null
): StrokePositionControls => {
  const [error, setError] = useState<string | null>(null);
  const tailwind = toTailwindClasses(classes);
  const styles = selection?.styles ?? NO_STYLES;
  const outerHTML = selection?.outerHTML ?? "";
  const variant = useEditVariant();

  const ring = useMemo(
    () => toRingStroke(outerHTML, styles, variant),
    [outerHTML, styles, variant]
  );

  const position = toStrokePosition(edit.values, ring);
  const isTailwind = tailwind !== null;
  const writeClasses = useClassWrite(edit, selection, setError);

  const outlineEdit = useMemo(
    () => toOutlineEdit(edit, position),
    [edit, position]
  );

  const handlePositionPick = useCallback(
    (next: string) =>
      applyPositionPick(
        { edit, isTailwind, position, ring, writeClasses },
        next
      ),
    [edit, isTailwind, position, ring, writeClasses]
  );

  const handleRemove = useCallback(() => {
    if (ring) {
      writeClasses({ classes: toRingRemoval(ring), style: {} });

      return;
    }

    edit.previewForced(toNoOutline(isTailwind));
    edit.commit();
  }, [edit, isTailwind, ring, writeClasses]);

  const { handleRingColor, handleRingWidth } = useRingWrites(
    writeClasses,
    variant
  );

  const hasStroke = ring !== null || hasOutline(edit.values);

  return {
    error,
    handlePositionPick,
    handleRemove,
    handleRingColor,
    handleRingWidth,
    hasStroke,
    outlineEdit,
    position,
    ring,
  };
};

export { useStrokePosition };

export type { StrokePositionControls };
