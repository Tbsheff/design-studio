import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { useRovingRadioGroup } from "../chat/level-control.js";

const ITEM_3 = 3;

const ITEM_4 = 4;

interface Props {
  value: number;
  max: number;
  onChange: (count: number) => void;
  disabled?: boolean;
  labelledBy?: string;
}

const OPTIONS = [1, 2, ITEM_3, ITEM_4] as const;

const toGroupLabel = (labelledBy: string | undefined): string | undefined => {
  if (!labelledBy) {
    return "Designs";
  }
};

const toOptionLabel = (count: number): string => {
  if (count === 1) {
    return "1 design (variations off)";
  }

  return `${count} variations`;
};

const toOptionClass = (isOn: boolean): string => {
  if (isOn) {
    return "on";
  }

  return "";
};

const VariationsControl = ({
  value,
  max,
  onChange,
  disabled,
  labelledBy,
}: Props): ReactElement => {
  const radios = useRovingRadioGroup<number>(
    OPTIONS,
    value,
    onChange,
    (countValue) => Boolean(disabled) || countValue > max
  );

  const { onKeyDown: handleKeyDown } = radios;

  const handlePick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void =>
      onChange(Number(event.currentTarget.dataset.count)),
    [onChange]
  );

  return (
    <div
      className="segmented variations-control"
      role="radiogroup"
      aria-label={toGroupLabel(labelledBy)}
      aria-labelledby={labelledBy}
      data-testid="variations-control"
      onKeyDown={handleKeyDown}
    >
      {OPTIONS.map((count) => {
        const item = radios.item(count);

        return (
          <button
            key={count}
            ref={item.ref}
            tabIndex={item.tabIndex}
            type="button"
            role="radio"
            aria-checked={count === value}
            aria-label={toOptionLabel(count)}
            disabled={Boolean(disabled) || count > max}
            className={toOptionClass(count === value)}
            data-count={count}
            onClick={handlePick}
          >
            {count}
          </button>
        );
      })}
    </div>
  );
};

export { VariationsControl };
