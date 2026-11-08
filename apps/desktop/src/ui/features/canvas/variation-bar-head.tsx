import type { DirectionVariation } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface VariationBarHeadProps {
  readonly count: number;
  readonly prompt: string;
  readonly variation: DirectionVariation | null;
}

const VariationBarHead = ({
  count,
  prompt,
  variation,
}: VariationBarHeadProps): ReactElement => {
  if (variation) {
    return (
      <>
        <span className="badge accent">{variation.label}</span>
        <span className="truncate">
          {variation.title}
          {copy.oneOf}
          {variation.count}
          {copy.variations}
        </span>
      </>
    );
  }

  return (
    <>
      <Icon name="compare" size={14} />
      <strong className="variation-bar-title">
        {count}
        {copy.variations}
      </strong>
      <span className="truncate variation-bar-prompt">{prompt}</span>
    </>
  );
};

export { VariationBarHead };
