import { useEffect } from "react";

import { focusRequest } from "./focus-bus-model.js";
import type { HomeLayer } from "./home-command-model.js";
import { WORKSPACE_KEYS } from "./workspace-model.js";

interface HomeKeysInput {
  readonly count: number;
  readonly onLayer: (layer: HomeLayer) => void;
  readonly onSelect: (index: number) => void;
}

const DIGIT_PREFIX = "Digit";

const hasCommandModifier = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;

const toDigitIndex = (code: string): number | null => {
  if (!code.startsWith(DIGIT_PREFIX)) {
    return null;
  }

  const digit = Number(code.slice(DIGIT_PREFIX.length));

  if (!Number.isInteger(digit) || digit < 1 || digit > WORKSPACE_KEYS) {
    return null;
  }

  return digit - 1;
};

const setComposerFocus = (): void => {
  focusRequest("prompt", true, true);
};

const hasRunHomeKey = (event: KeyboardEvent, input: HomeKeysInput): boolean => {
  if (event.code === "KeyN") {
    setComposerFocus();

    return true;
  }

  if (event.code === "KeyO") {
    input.onLayer("projects");

    return true;
  }

  const index = toDigitIndex(event.code);

  if (index === null || index >= input.count) {
    return false;
  }

  input.onSelect(index);

  return true;
};

const useHomeKeys = (input: HomeKeysInput): void => {
  const { count, onLayer, onSelect } = input;

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!hasCommandModifier(event) || event.repeat) {
        return;
      }

      if (hasRunHomeKey(event, { count, onLayer, onSelect })) {
        event.preventDefault();
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
    };
  }, [count, onLayer, onSelect]);
};

export { setComposerFocus, useHomeKeys };
