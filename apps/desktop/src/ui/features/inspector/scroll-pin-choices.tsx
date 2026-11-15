import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { toOnClass } from "./auto-layout-model.js";

interface ScrollPinChoice {
  readonly label: string;
  readonly value: string;
}

interface Props {
  readonly label: string;
  readonly locked: string | null;
  readonly lockedTip: string;
  readonly options: readonly ScrollPinChoice[];
  readonly value: string;
  readonly onPick: (value: string) => void;
}

const toLockedTip = (
  value: string,
  locked: string | null,
  tip: string
): string | null => {
  if (value === locked) {
    return tip;
  }

  return null;
};

const ScrollPinChoices = ({
  label,
  locked,
  lockedTip,
  options,
  value,
  onPick,
}: Props): ReactElement => {
  const handlePick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const next = event.currentTarget.value;

      if (next !== locked) {
        onPick(next);
      }
    },
    [locked, onPick]
  );

  return (
    <fieldset className="segmented ins-scroll-pin-seg" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          value={option.value}
          className={toOnClass(value === option.value)}
          aria-pressed={value === option.value}
          aria-disabled={option.value === locked}
          data-tip={toLockedTip(option.value, locked, lockedTip)}
          onClick={handlePick}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
};

export { ScrollPinChoices };
