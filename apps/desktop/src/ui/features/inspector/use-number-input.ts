import { useCallback, useRef, useState } from "react";
import type {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from "react";

import { hasCurrentDependency } from "./mixed-values-model.js";
import type { NumberSpec } from "./number-field-model.js";
import { toShownText } from "./number-input-model.js";
import { useNumberKeys } from "./use-number-keys.js";
import { useNumberText } from "./use-number-text.js";

interface NumberInputState {
  readonly shown: string;
  readonly isMixed: boolean;
  readonly isRefused: boolean;
  readonly change: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly keyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly pointerDown: (event: PointerEvent<HTMLInputElement>) => void;
  readonly mouseUp: (event: MouseEvent<HTMLInputElement>) => void;
  readonly focus: (event: FocusEvent<HTMLInputElement>) => void;
  readonly blur: () => void;
}

const useNumberInput = (spec: NumberSpec): NumberInputState => {
  const [isFocused, setIsFocused] = useState(false);
  const keepSelection = useRef(false);
  const field = useNumberText(spec);
  const { apply, isMixed, settle } = field;
  const shown = toShownText(field.text, isFocused, field.current, spec);

  const isRefused =
    isMixed &&
    field.text !== null &&
    hasCurrentDependency(field.text, field.unit);

  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => apply(event.target.value),
    [apply]
  );

  const keyDown = useNumberKeys(spec, field, shown);

  const pointerDown = useCallback((event: PointerEvent<HTMLInputElement>) => {
    keepSelection.current = document.activeElement !== event.currentTarget;
  }, []);

  const mouseUp = useCallback((event: MouseEvent<HTMLInputElement>) => {
    if (keepSelection.current) {
      keepSelection.current = false;
      event.preventDefault();
    }
  }, []);

  const focus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    event.currentTarget.select();
  }, []);

  const blur = useCallback(() => {
    setIsFocused(false);
    settle();
  }, [settle]);

  return {
    blur,
    change,
    focus,
    isMixed,
    isRefused,
    keyDown,
    mouseUp,
    pointerDown,
    shown,
  };
};

export { useNumberInput };

export type { NumberInputState };
