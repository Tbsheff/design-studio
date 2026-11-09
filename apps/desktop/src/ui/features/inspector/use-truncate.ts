import type { SelectionContext } from "@design-studio/contracts";
import { startTransition, useCallback, useMemo, useState } from "react";

import { api, errorText } from "../../api.js";
import type { DirectEdit } from "./deps.js";
import { toEditTarget } from "./edit-request-model.js";
import type { ElementClasses } from "./element-classes-model.js";
import { applyEdit } from "./simple-model.js";
import {
  toClampedLines,
  toClassChange,
  toStyleChange,
  toTruncateKey,
  toTruncateState,
} from "./truncate-model.js";
import type { TruncateState } from "./truncate-model.js";

interface Truncate {
  readonly error: string | null;
  readonly isReady: boolean;
  readonly onLines: (lines: number) => void;
  readonly onToggle: () => void;
  readonly state: TruncateState;
}

interface Pending {
  readonly base: string;
  readonly state: TruncateState;
}

const toTailwindClasses = (
  classes: ElementClasses
): readonly string[] | null => {
  if (
    classes.variants?.mode === "classes" &&
    classes.tailwind?.mode === "classes"
  ) {
    return classes.tailwind.classes;
  }

  return null;
};

const useTruncate = (
  edit: DirectEdit,
  selection: SelectionContext,
  classes: ElementClasses
): Truncate => {
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const tailwind = toTailwindClasses(classes);
  const isReady = classes.variants !== null;

  const derived = useMemo(
    () => toTruncateState(tailwind, edit.values),
    [tailwind, edit.values]
  );

  const base = toTruncateKey(derived);
  let state = derived;

  if (pending?.base === base) {
    ({ state } = pending);
  }

  const { directionId, projectId } = edit.scope;
  const { source } = selection;

  const run = useCallback(
    (next: TruncateState) => {
      setMessage(null);

      if (tailwind === null) {
        applyEdit(edit, toStyleChange(edit.values, next));

        return;
      }

      if (!source || !directionId) {
        return;
      }

      setPending({ base, state: next });

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
          setPending(null);
          setMessage(errorText(error));
        }
      });
    },
    [base, directionId, edit, projectId, selection, source, tailwind]
  );

  const onToggle = useCallback(() => {
    run({ isOn: !state.isOn, lines: state.lines });
  }, [run, state]);

  const onLines = useCallback(
    (lines: number) => {
      run({ isOn: true, lines: toClampedLines(lines) });
    },
    [run]
  );

  return { error: message, isReady, onLines, onToggle, state };
};

export { useTruncate };

export type { Truncate };
