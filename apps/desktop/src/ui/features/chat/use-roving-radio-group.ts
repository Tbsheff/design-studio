import { useRef } from "react";
import type { KeyboardEvent } from "react";

import { nextRadioOption } from "./radio-nav-model.js";

interface ItemResult {
  readonly ref: (el: HTMLButtonElement | null) => void;
  readonly tabIndex: number;
}

interface UseRovingRadioGroupResult<Option> {
  readonly item: (option: Option) => ItemResult;
  readonly register: (option: Option, el: HTMLButtonElement | null) => void;
  readonly tabIndexOf: (option: Option) => number;
  readonly onKeyDown: (event: KeyboardEvent) => void;
}

const isNeverDisabled = (): boolean => false;

const toTabIndex = (isCurrent: boolean): number => {
  if (isCurrent) {
    return 0;
  }

  return -1;
};

const useRovingRadioGroup = <Option extends string | number>(
  options: readonly Option[],
  value: Option,
  onChange: (next: Option) => void,
  isDisabled: ((option: Option) => boolean) | null = null
): UseRovingRadioGroupResult<Option> => {
  const refs = useRef(new Map<Option, HTMLButtonElement | null>());

  const onKeyDown = (event: KeyboardEvent): void => {
    const next = nextRadioOption(
      options,
      value,
      event.key,
      isDisabled ?? isNeverDisabled
    );

    if (next === null) {
      return;
    }

    event.preventDefault();

    if (next !== value) {
      onChange(next);
    }

    refs.current.get(next)?.focus();
  };

  const register = (option: Option, el: HTMLButtonElement | null): void => {
    refs.current.set(option, el);
  };

  const tabIndexOf = (option: Option): number => toTabIndex(option === value);

  const item = (option: Option): ItemResult => ({
    ref: (el: HTMLButtonElement | null): void => register(option, el),
    tabIndex: tabIndexOf(option),
  });

  return { item, onKeyDown, register, tabIndexOf };
};

export { useRovingRadioGroup };
