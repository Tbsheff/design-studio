import type { KeyboardEvent, ReactElement } from "react";

import { toChoiceTabIndex } from "./clarify-model.js";
import { ClarifyOption } from "./clarify-option.js";

const ClarifyChoices = ({
  labelledBy,
  options,
  picked,
  tabIndexOf,
  onKeyDown,
  onPick,
  onRegister,
}: {
  labelledBy: string;
  options: readonly string[];
  picked: string;
  tabIndexOf: (option: string) => number;
  onKeyDown: (event: KeyboardEvent) => void;
  onPick: (value: string) => void;
  onRegister: (option: string, element: HTMLButtonElement | null) => void;
}): ReactElement => (
  <div
    tabIndex={0}
    className="clarify-choices"
    role="radiogroup"
    aria-labelledby={labelledBy}
    onKeyDown={onKeyDown}
  >
    {options.map((option, index) => (
      <ClarifyOption
        key={option}
        isOn={picked === option}
        option={option}
        tabIndex={toChoiceTabIndex(picked, index, tabIndexOf(option))}
        onPick={onPick}
        onRegister={onRegister}
      />
    ))}
  </div>
);

export { ClarifyChoices };
