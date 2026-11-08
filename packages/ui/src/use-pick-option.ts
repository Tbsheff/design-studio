import { useCallback } from "react";
import type { RefObject } from "react";

import type { UiSelectOption } from "./ui-select-model.js";

interface PickInput<OptionValue extends string> {
  readonly button: RefObject<HTMLButtonElement | null>;
  readonly close: () => void;
  readonly onChange: (value: OptionValue) => void;
  readonly options: readonly UiSelectOption<OptionValue>[];
  readonly value: OptionValue;
}

const usePickOption = <OptionValue extends string>(
  input: PickInput<OptionValue>
): ((index: number) => void) => {
  const { button, close, onChange, options, value } = input;

  return useCallback(
    (index: number) => {
      const option = options[index];

      if (!option || option.disabled) {
        return;
      }

      close();
      button.current?.focus();

      if (option.value !== value) {
        onChange(option.value);
      }
    },
    [options, value, onChange, close, button]
  );
};

export { usePickOption };
