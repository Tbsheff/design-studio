import { memo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { normalizeLength, stepValue } from "./css-values.js";
import { useInherited } from "./edit-variant.js";
import { resolveNumberInput } from "./math-input.js";
import { dependsOnCurrent } from "./mixed-values.js";
import {
  plainLength,
  displayLength,
  clamp,
  patchFor,
  shiftMixed,
  stepOf,
  isValidValue,
  selectSoon,
  sameSpec,
} from "./number-field-model.js";
import type { NumberSpec } from "./number-field-model.js";
import { useTokenUi } from "./use-token-snap.js";

interface InputProps {
  readonly spec: NumberSpec;
  readonly id?: string;
  readonly className?: string;
}

const useNumberText = (spec: NumberSpec) => {
  const { edit, prop } = spec;
  const [text, setText] = useState<string | null>(null);
  const start = useRef<string | null>(null);
  const last = useRef<string | null>(null);
  const ui = useTokenUi();
  const unit = spec.unit ?? "px";
  const current = plainLength(edit.values[prop], ui);
  const mixed = edit.mixed.has(prop);

  const apply = (raw: string) => {
    if (start.current === null) {
      start.current = current;
    }

    setText(raw);

    if (mixed && dependsOnCurrent(raw, unit)) {
      return;
    }

    const math = resolveNumberInput(raw, start.current, unit);

    if (math === null && /[-+*/(]\s*$/u.test(raw)) {
      return;
    }

    const next = clamp(math ?? normalizeLength(raw, unit), spec);
    last.current = next;
    edit.preview(patchFor(spec, next));
  };

  const settle = () => {
    const typed = last.current;
    start.current = null;
    last.current = null;
    setText(null);

    if (typed !== null && !isValidValue(prop, typed)) {
      edit.revert(spec.targets ?? [prop]);
    }

    edit.commit();
  };

  const nudge = (delta: number, from: string) => {
    start.current = null;
    last.current = null;
    const next = clamp(stepValue(from, delta, unit), spec);
    setText(next);
    edit.preview(patchFor(spec, next));
    edit.commitSoon();
  };

  const cancel = () => {
    start.current = null;
    last.current = null;
    setText(null);
    edit.revert(spec.targets ?? [prop]);
  };

  return { apply, cancel, current, mixed, nudge, settle, text, unit };
};

const NumberInputView = ({ spec, id, className }: InputProps) => {
  const [focused, setFocused] = useState(false);
  const keepSelection = useRef(false);
  const field = useNumberText(spec);
  const inherited = useInherited(spec.prop);

  const shown =
    field.text ??
    (focused ? field.current : (spec.display ?? displayLength(field.current)));

  const refused =
    field.mixed &&
    field.text !== null &&
    dependsOnCurrent(field.text, field.unit);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const delta = stepOf(event, spec) * (event.key === "ArrowUp" ? 1 : -1);

      if (field.mixed) {
        shiftMixed(spec, delta);
        spec.edit.commitSoon();

        return;
      }

      field.nudge(delta, shown);
      selectSoon(input);
    } else if (event.key === "Enter") {
      event.preventDefault();
      field.settle();
      selectSoon(input);
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
      placeholder={field.mixed ? "Mixed" : "—"}
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
  (a, b) =>
    a.id === b.id && a.className === b.className && sameSpec(a.spec, b.spec)
);

export { useNumberText, NumberInputView, NumberInput };

export type { InputProps };
