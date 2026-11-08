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

function VariationsControl({
  value,
  max,
  onChange,
  disabled,
  labelledBy,
}: Props): ReactElement {
  const radios = useRovingRadioGroup<number>(
    OPTIONS,
    value,
    onChange,
    (n) => Boolean(disabled) || n > max
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
      {OPTIONS.map((n) => (
        <button
          key={n}
          {...radios.item(n)}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={n === 1 ? "1 design (variations off)" : `${n} variations`}
          disabled={disabled || n > max}
          className={n === value ? "on" : ""}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export { VariationsControl };
