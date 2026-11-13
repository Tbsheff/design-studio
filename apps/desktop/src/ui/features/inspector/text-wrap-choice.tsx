import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { TextWrapButton } from "./text-wrap-button.js";
import type { TextWrap, TextWrapOption } from "./text-wrap-model.js";

interface TextWrapChoiceProps {
  readonly isDisabled: boolean;
  readonly onPick: (wrap: TextWrap) => void;
  readonly wrap: TextWrap;
}

const OPTIONS: readonly TextWrapOption[] = [
  {
    label: copy.textWrapDefault,
    tip: copy.textWrapDefaultTip,
    value: "default",
  },
  {
    label: copy.textWrapBalance,
    tip: copy.textWrapBalanceTip,
    value: "balance",
  },
  {
    label: copy.textWrapPretty,
    tip: copy.textWrapPrettyTip,
    value: "pretty",
  },
  {
    label: copy.textWrapNone,
    tip: copy.textWrapNoneTip,
    value: "nowrap",
  },
];

const TextWrapChoice = ({
  isDisabled,
  onPick,
  wrap,
}: TextWrapChoiceProps): ReactElement => (
  <div className="segmented" role="toolbar" aria-label={copy.textWrapLabel}>
    {OPTIONS.map((option) => (
      <TextWrapButton
        key={option.value}
        isCurrent={wrap === option.value}
        isDisabled={isDisabled}
        onPick={onPick}
        option={option}
      />
    ))}
  </div>
);

export { TextWrapChoice };
