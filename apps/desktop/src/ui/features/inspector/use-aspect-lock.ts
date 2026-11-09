import type { SelectionContext } from "@design-studio/contracts";
import { startTransition, useCallback, useMemo, useState } from "react";

import { api, errorText } from "../../api.js";
import {
  toBoxSize,
  toLockClassChange,
  toLockStyleChange,
  toLockedPatch,
  toLockedRatio,
  toUnlockClassChange,
  toUnlockStyleChange,
} from "./aspect-lock-model.js";
import type { AspectChange, BoxSize } from "./aspect-lock-model.js";
import type { StyleValues } from "./css-value-model.js";
import type { DirectEdit } from "./deps.js";
import { toEditTarget } from "./edit-request-model.js";
import type { ElementClasses } from "./element-classes-model.js";

interface AspectLock {
  readonly error: string | null;
  readonly heightEdit: DirectEdit | null;
  readonly isOn: boolean;
  readonly isReady: boolean;
  readonly handleToggle: () => void;
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

const toStylePatch = (isOn: boolean, box: BoxSize): Partial<StyleValues> => {
  if (isOn) {
    return toLockStyleChange(box);
  }

  return toUnlockStyleChange(box);
};

const toClassPatch = (
  isOn: boolean,
  classes: readonly string[],
  box: BoxSize
): AspectChange => {
  if (isOn) {
    return toLockClassChange(classes, box);
  }

  return toUnlockClassChange(classes, box);
};

const toLockedEdit = (
  edit: DirectEdit,
  used: string,
  ratio: number
): DirectEdit => ({
  ...edit,
  preview: (patch) => edit.preview(toLockedPatch(patch, ratio)),
  previewForced: (patch) => edit.previewForced(toLockedPatch(patch, ratio)),
  shift: (props, delta, bounds, part) =>
    edit.shift(
      props.map((prop) => {
        if (prop === "height") {
          return "width";
        }

        return prop;
      }),
      delta * ratio,
      bounds,
      part
    ),
  values: { ...edit.values, height: used },
});

const useAspectLock = (
  edit: DirectEdit,
  selection: SelectionContext,
  classes: ElementClasses | null
): AspectLock => {
  const [message, setMessage] = useState<string | null>(null);
  const tailwind = toTailwindClasses(classes);
  const isLoaded = classes !== null && classes.variants !== null;
  const { directionId, projectId } = edit.scope;
  const { source } = selection;
  const box = useMemo(() => toBoxSize(selection.styles), [selection.styles]);

  const ratio = toLockedRatio(
    edit.values,
    selection.styles["authored-height"] ?? ""
  );

  const isOn = ratio !== null;
  const used = selection.styles["used-height"] ?? edit.values.height;

  const heightEdit = useMemo(() => {
    if (ratio === null) {
      return null;
    }

    return toLockedEdit(edit, used, ratio);
  }, [edit, ratio, used]);

  const run = useCallback(
    (nextOn: boolean) => {
      if (!box) {
        return;
      }

      setMessage(null);

      if (tailwind === null) {
        edit.previewForced(toStylePatch(nextOn, box));
        edit.commit();

        return;
      }

      if (!source || !directionId) {
        return;
      }

      startTransition(async () => {
        try {
          await api.directEdit(projectId, directionId, {
            classes: toClassPatch(nextOn, tailwind, box),
            selector: selection.selector,
            source,
            ...toEditTarget(selection),
          });
          edit.absorb({});
          edit.reselect();
        } catch (error) {
          setMessage(errorText(error));
        }
      });
    },
    [box, directionId, edit, projectId, selection, source, tailwind]
  );

  const handleToggle = useCallback(() => run(!isOn), [isOn, run]);

  const isReady = isLoaded && box !== null;

  return { error: message, handleToggle, heightEdit, isOn, isReady };
};

export { useAspectLock };

export type { AspectLock };
