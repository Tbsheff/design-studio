import type { SelectionContext } from "@design-studio/contracts";
import { startTransition, useCallback, useMemo, useState } from "react";

import { api, errorText } from "../../api.js";
import type { DirectEdit } from "./deps.js";
import { toEditTarget } from "./edit-request-model.js";
import type { ElementClasses } from "./element-classes-model.js";
import { applyEdit } from "./simple-model.js";
import { toClassChange, toStyleChange, toTextWrap } from "./text-wrap-model.js";
import type { TextWrap } from "./text-wrap-model.js";

interface TextWrapControls {
  readonly error: string | null;
  readonly isReady: boolean;
  readonly onPick: (wrap: TextWrap) => void;
  readonly wrap: TextWrap;
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

const useTextWrap = (
  edit: DirectEdit,
  selection: SelectionContext | null,
  classes: ElementClasses | null
): TextWrapControls => {
  const [message, setMessage] = useState<string | null>(null);
  const tailwind = toTailwindClasses(classes);
  const isReady = classes === null || classes.variants !== null;

  const wrap = useMemo(
    () => toTextWrap(edit.values, tailwind),
    [edit.values, tailwind]
  );

  const { directionId, projectId } = edit.scope;

  const onPick = useCallback(
    (next: TextWrap) => {
      setMessage(null);

      if (next === wrap) {
        return;
      }

      if (tailwind === null) {
        applyEdit(edit, toStyleChange(next));

        return;
      }

      const source = selection?.source;

      if (!selection || !source || !directionId) {
        return;
      }

      startTransition(async () => {
        try {
          await api.directEdit(projectId, directionId, {
            classes: toClassChange(next),
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
    [directionId, edit, projectId, selection, tailwind, wrap]
  );

  return { error: message, isReady, onPick, wrap };
};

export { useTextWrap };

export type { TextWrapControls };
