import { memo, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { normalizeLength, stepValue } from "./css-values.js";
import { isInherited, useVariantScope } from "./edit-variant.js";
import { toNumberInput } from "./math-input.js";
import { hasCurrentDependency } from "./mixed-values.js";
import {
  toPlainLength,
  toDisplayLength,
  toClamped,
  toPatch,
  applyMixedShift,
  toStep,
  isValidValue,
  startSelect,
  sameSpec,
} from "./number-field-model.js";
import type { NumberSpec } from "./number-field-model.js";
import { useTokenUi } from "./use-token-snap.js";

interface InputProps {
  readonly spec: NumberSpec;
  readonly id?: string;
  readonly className?: string;
}

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
  const mixed = edit.mixed.has(prop);

  const apply = (raw: string): void => {
    if (start.current === null) {
      start.current = current;
    }

    setText(raw);

    if (mixed && hasCurrentDependency(raw, unit)) {
      return;
    }

    const math = toNumberInput(raw, start.current, unit);

    if (math === null && /[-+*/(]\s*$/u.test(raw)) {
      return;
    }

    const next = toClamped(math ?? normalizeLength(raw, unit), spec);
    last.current = next;
    edit.preview(toPatch(spec, next));
  };

  const settle = (): void => {
    const typed = last.current;
    start.current = null;
    last.current = null;
    setText(null);

    if (typed !== null && !isValidValue(prop, typed)) {
      edit.revert(spec.targets ?? [prop]);
    }

    edit.commit();
  };

  const nudge = (delta: number, from: string): void => {
    start.current = null;
    last.current = null;
    const next = toClamped(stepValue(from, delta, unit), spec);
    setText(next);
    edit.preview(toPatch(spec, next));
    edit.commitSoon();
  };

  const cancel = (): void => {
    start.current = null;
    last.current = null;
    setText(null);
    edit.revert(spec.targets ?? [prop]);
  };

  return { apply, cancel, current, isMixed: mixed, nudge, settle, text, unit };
};

const NumberInputView = ({ spec, id, className }: InputProps): ReactElement => {
  const [focused, setFocused] = useState(false);
  const keepSelection = useRef(false);
  const field = useNumberText(spec);
  const inherited = isInherited(useVariantScope(), spec.prop);

  const shown =
    field.text ??
    (focused
      ? field.current
      : (spec.display ?? toDisplayLength(field.current)));

  const refused =
    field.isMixed &&
    field.text !== null &&
    hasCurrentDependency(field.text, field.unit);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    const input = event.currentTarget;

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const delta = toStep(event, spec) * (event.key === "ArrowUp" ? 1 : -1);

      if (field.isMixed) {
        applyMixedShift(spec, delta);
        spec.edit.commitSoon();

        return;
      }

      field.nudge(delta, shown);
      startSelect(input);
    } else if (event.key === "Enter") {
      event.preventDefault();
      field.settle();
      startSelect(input);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      field.cancel();
      input.blur();
    }
  };

  return (
    <input
      id={id}
      className={`ins-input num ${className ?? ""} ${inherited ? "inherited" : ""}`}
      aria-label={spec.label}
      value={shown}
      spellCheck={false}
      autoComplete="off"
      placeholder={field.isMixed ? "Mixed" : "—"}
      aria-invalid={refused || undefined}
      data-tip={
        refused ? "Values differ. Type a number, not a change." : undefined
      }
      onChange={(event) => field.apply(event.target.value)}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        keepSelection.current = document.activeElement !== event.currentTarget;
      }}
      onMouseUp={(event) => {
        if (!keepSelection.current) {
          return;
        }

        keepSelection.current = false;
        event.preventDefault();
      }}
      onFocus={(event) => {
        setFocused(true);
        event.currentTarget.select();
      }}
      onBlur={() => {
        setFocused(false);
        field.settle();
      }}
    />
  );
};

const NumberInput = memo(
  NumberInputView,
  (first, second) =>
    first.id === second.id &&
    first.className === second.className &&
    sameSpec(first.spec, second.spec)
);

export { useNumberText, NumberInputView, NumberInput };

export type { InputProps };
