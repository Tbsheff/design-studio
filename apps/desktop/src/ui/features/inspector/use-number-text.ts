import { useCallback, useRef, useState } from "react";

import { normalizeLength, stepValue } from "./css-values.js";
import { toNumberInput } from "./math-input-model.js";
import { hasCurrentDependency } from "./mixed-values-model.js";
import {
  toClamped,
  toPatch,
  toPlainLength,
  isValidValue,
} from "./number-field-model.js";
import type { NumberSpec } from "./number-field-model.js";
import { isIncompleteMath } from "./number-input-model.js";
import { useTokenUi } from "./use-token-snap.js";

interface UseNumberTextResult {
  readonly apply: (raw: string) => void;
  readonly cancel: () => void;
  readonly current: string;
  readonly isMixed: boolean;
  readonly nudge: (delta: number, from: string) => void;
  readonly settle: () => void;
  readonly text: string | null;
  readonly unit: string;
}

const useNumberText = (spec: NumberSpec): UseNumberTextResult => {
  const { edit, prop } = spec;
  const [text, setText] = useState<string | null>(null);
  const start = useRef<string | null>(null);
  const last = useRef<string | null>(null);
  const ui = useTokenUi();
  const unit = spec.unit ?? "px";
  const current = toPlainLength(edit.values[prop], ui);
  const isMixed = edit.mixed.has(prop);

  const apply = useCallback(
    (raw: string): void => {
      if (start.current === null) {
        start.current = current;
      }

      setText(raw);

      if (isMixed && hasCurrentDependency(raw, unit)) {
        return;
      }

      const math = toNumberInput(raw, start.current, unit);

      if (math === null && isIncompleteMath(raw)) {
        return;
      }

      const next = toClamped(math ?? normalizeLength(raw, unit), spec);
      last.current = next;
      edit.preview(toPatch(spec, next));
    },
    [current, isMixed, unit, spec, edit]
  );

  const settle = useCallback((): void => {
    const typed = last.current;
    start.current = null;
    last.current = null;
    setText(null);

    if (typed !== null && !isValidValue(prop, typed)) {
      edit.revert(spec.targets ?? [prop]);
    }

    edit.commit();
  }, [prop, spec.targets, edit]);

  const nudge = useCallback(
    (delta: number, from: string): void => {
      start.current = null;
      last.current = null;
      const next = toClamped(stepValue(from, delta, unit), spec);
      setText(next);
      edit.preview(toPatch(spec, next));
      edit.commitSoon();
    },
    [unit, spec, edit]
  );

  const cancel = useCallback((): void => {
    start.current = null;
    last.current = null;
    setText(null);
    edit.revert(spec.targets ?? [prop]);
  }, [prop, spec.targets, edit]);

  return { apply, cancel, current, isMixed, nudge, settle, text, unit };
};

export { useNumberText };

export type { UseNumberTextResult };
