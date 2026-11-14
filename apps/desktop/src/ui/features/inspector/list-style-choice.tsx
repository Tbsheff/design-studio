import type { ReactElement } from "react";

import { textListCopy } from "./copy.js";
import { ListStyleButton } from "./list-style-button.js";
import type { ListType, ListTypeOption } from "./list-style-model.js";

interface ListStyleChoiceProps {
  readonly isDisabled: boolean;
  readonly onPick: (type: ListType) => void;
  readonly type: ListType | null;
}

const OPTIONS: readonly ListTypeOption[] = [
  { label: textListCopy.none, tip: textListCopy.noneTip, value: "none" },
  {
    label: textListCopy.bullets,
    tip: textListCopy.bulletsTip,
    value: "disc",
  },
  {
    label: textListCopy.numbers,
    tip: textListCopy.numbersTip,
    value: "decimal",
  },
];

const ListStyleChoice = ({
  isDisabled,
  onPick,
  type,
}: ListStyleChoiceProps): ReactElement => (
  <div className="segmented" role="toolbar" aria-label={textListCopy.typeLabel}>
    {OPTIONS.map((option) => (
      <ListStyleButton
        key={option.value}
        isCurrent={type === option.value}
        isDisabled={isDisabled}
        onPick={onPick}
        option={option}
      />
    ))}
  </div>
);

export { ListStyleChoice };
