import { useCallback } from "react";
import type { KeyboardEvent } from "react";

import { isOpenKey, isPrintable, toMove } from "./ui-select-model.js";
import type { UiSelectOption } from "./ui-select-model.js";
import { useTypeahead } from "./use-typeahead.js";

interface SelectKeysInput<OptionValue extends string> {
  readonly active: number;
  readonly close: () => void;
  readonly isOpen: boolean;
  readonly onChange: (value: OptionValue) => void;
  readonly onPick: (index: number) => void;
  readonly options: readonly UiSelectOption<OptionValue>[];
  readonly setActive: (index: number) => void;
  readonly show: () => void;
}

const toTyped = (key: string, find: (key: string) => number): number | null => {
  if (isPrintable(key)) {
    return find(key);
  }

  return null;
};

const isSkippedKey = (
  event: KeyboardEvent<HTMLButtonElement>,
  isOpen: boolean
): boolean => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return true;
  }

  return !isOpen && !isOpenKey(event.key) && !isPrintable(event.key);
};

const useSelectKeys = <OptionValue extends string>(
  input: SelectKeysInput<OptionValue>
): ((event: KeyboardEvent<HTMLButtonElement>) => void) => {
  const { active, close, isOpen, onChange, onPick, options, setActive, show } =
    input;

  const find = useTypeahead(options, active);

  const onOpenKey = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Escape") {
        close();

        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        onPick(active);

        return;
      }

      const next =
        toMove(event.key, options, active) ?? toTyped(event.key, find);

      if (next !== null && next >= 0) {
        setActive(next);
      }
    },
    [close, onPick, options, active, find, setActive]
  );

  return useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Tab") {
        close();

        return;
      }

      if (isSkippedKey(event, isOpen)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (isOpen) {
        onOpenKey(event);

        return;
      }

      if (isOpenKey(event.key)) {
        show();

        return;
      }

      const option = options[find(event.key)];

      if (option) {
        onChange(option.value);
      }
    },
    [isOpen, close, onOpenKey, show, find, options, onChange]
  );
};

export { useSelectKeys };
