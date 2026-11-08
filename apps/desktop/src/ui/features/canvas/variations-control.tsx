import type { ReactElement } from "react";

import { useRovingRadioGroup } from "../chat/level-control.js";

const ITEM_1 = 1;

const ITEM_2 = 2;

const ITEM_3 = 3;

const ITEM_4 = 4;

const COUNT3_1 = 1;

interface Props {
  value: number;
  max: number;
  onChange: (count: number) => void;
  disabled?: boolean;
  labelledBy?: string;
}

const OPTIONS = [ITEM_1, ITEM_2, ITEM_3, ITEM_4] as const;

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

  const arialabel: "Designs" | undefined = ((): "Designs" | undefined => {
    if (labelledBy) {
      return undefined;
    }
    return "Designs";
  })();

  return (
    <div
      className="segmented variations-control"
      role="radiogroup"
      aria-label={arialabel}
      aria-labelledby={labelledBy}
      data-testid="variations-control"
      onKeyDown={radios.onKeyDown}
    >
      {OPTIONS.map((count3) => {
        let arialabel2 = `${count3} variations`;

        if (count3 === COUNT3_1) {
          arialabel2 = "1 design (variations off)";
        }

        let className2: "" | "on" = "";

        if (count3 === value) {
          className2 = "on";
        }

        return (
          <button
            key={count3}
            {...radios.item(count3)}
            type="button"
            role="radio"
            aria-checked={count3 === value}
            aria-label={arialabel2}
            disabled={disabled || count3 > max}
            className={className2}
            onClick={() => onChange(count3)}
          >
            {count3}
          </button>
        );
      })}
    </div>
  );
};

export { VariationsControl };
