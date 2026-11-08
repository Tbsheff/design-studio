import { useId } from "react";
import type { ReactElement } from "react";

import { VariationsControlOption } from "./variations-control-option.js";

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

const VariationsControl = ({
  value,
  max,
  onChange,
  disabled,
  labelledBy,
}: Props): ReactElement => {
  const name = useId();

  return (
    <div
      className="segmented variations-control"
      role="radiogroup"
      aria-label={toGroupLabel(labelledBy)}
      aria-labelledby={labelledBy}
      data-testid="variations-control"
    >
      {OPTIONS.map((count) => (
        <VariationsControlOption
          key={count}
          count={count}
          isDisabled={Boolean(disabled) || count > max}
          isOn={count === value}
          label={toOptionLabel(count)}
          name={name}
          onChange={onChange}
        />
      ))}
    </div>
  );
};

export { VariationsControl };
