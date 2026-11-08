import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ElementVariantsCountButton } from "./element-variants-count-button.js";
import { VARIANT_COUNTS } from "./element-variants-model.js";

interface Props {
  readonly count: number;
  readonly max: number;
  readonly onPick: (value: number) => void;
}

const ElementVariantsCount = ({ count, max, onPick }: Props): ReactElement => (
  <fieldset
    className="element-variants-count"
    aria-label={copy.howManyVariants}
  >
    <span>{copy.variants}</span>
    {VARIANT_COUNTS.map((value) => (
      <ElementVariantsCountButton
        key={value}
        value={value}
        max={max}
        isSelected={count === value}
        onPick={onPick}
      />
    ))}
  </fieldset>
);

export { ElementVariantsCount };
