import type { ReactElement } from "react";

import { useRovingRadioGroup } from "../chat/level-control.js";

interface Props {
  value: number;
  max: number;
  onChange: (count: number) => void;
  disabled?: boolean;
  labelledBy?: string;
}

const OPTIONS = [1, 2, 3, 4] as const;

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

  return (
    <div
      className="segmented variations-control"
      role="radiogroup"
      aria-label={labelledBy ? undefined : "Designs"}
      aria-labelledby={labelledBy}
      data-testid="variations-control"
      onKeyDown={radios.onKeyDown}
    >
      {OPTIONS.map((count3) => (
        <button
          key={count3}
          {...radios.item(count3)}
          type="button"
          role="radio"
          aria-checked={count3 === value}
          aria-label={
            count3 === 1 ? "1 design (variations off)" : `${count3} variations`
          }
          disabled={disabled || count3 > max}
          className={count3 === value ? "on" : ""}
          onClick={() => onChange(count3)}
        >
          {count3}
        </button>
      ))}
    </div>
  );
};

export { VariationsControl };
