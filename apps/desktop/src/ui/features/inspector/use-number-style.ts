import type { SelectionContext } from "@design-studio/contracts";
import { startTransition, useCallback, useMemo, useState } from "react";

import { api, errorText } from "../../api.js";
import type { DirectEdit } from "./deps.js";
import { toEditTarget } from "./edit-request-model.js";
import type { ElementClasses } from "./element-classes-model.js";
import {
  toClassChange,
  toFigureStyle,
  toNumberStyle,
  toSlashedStyle,
  toSpacingStyle,
  toStyleChange,
} from "./number-style-model.js";
import type {
  NumberFigure,
  NumberSpacing,
  NumberStyle,
} from "./number-style-model.js";
import { applyEdit } from "./simple-model.js";

interface NumberStyleControls {
  readonly error: string | null;
  readonly isReady: boolean;
  readonly onFigure: (figure: NumberFigure) => void;
  readonly onSlashed: () => void;
  readonly onSpacing: (spacing: NumberSpacing) => void;
  readonly style: NumberStyle;
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

const useNumberStyle = (
  edit: DirectEdit,
  selection: SelectionContext | null,
  classes: ElementClasses | null
): NumberStyleControls => {
  const [message, setMessage] = useState<string | null>(null);
  const tailwind = toTailwindClasses(classes);
  const isReady = classes === null || classes.variants !== null;

  const style = useMemo(
    () => toNumberStyle(edit.values, tailwind),
    [edit.values, tailwind]
  );

  const { directionId, projectId } = edit.scope;

  const run = useCallback(
    (next: NumberStyle) => {
      setMessage(null);

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
            classes: toClassChange(tailwind, next),
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
    [directionId, edit, projectId, selection, tailwind]
  );

  const onSpacing = useCallback(
    (spacing: NumberSpacing) => {
      run(toSpacingStyle(style, spacing));
    },
    [run, style]
  );

  const onFigure = useCallback(
    (figure: NumberFigure) => {
      run(toFigureStyle(style, figure));
    },
    [run, style]
  );

  const onSlashed = useCallback(() => {
    run(toSlashedStyle(style));
  }, [run, style]);

  return { error: message, isReady, onFigure, onSlashed, onSpacing, style };
};

export { useNumberStyle };

export type { NumberStyleControls };
