import type { CSSProperties, ReactElement } from "react";

import { pick } from "./pick.js";
import { LISTBOX_ROLE } from "./ui-select-model.js";
import type { UiSelectOption } from "./ui-select-model.js";
import { UiSelectOptionRow } from "./ui-select-option.js";

const UiSelectMenu = ({
  attach,
  listId,
  placement,
  options,
  value,
  active,
  isOpen,
  label,
  labelledBy,
  onPick,
  onHover,
}: {
  attach: (node: HTMLDivElement | null) => void;
  listId: string;
  placement: CSSProperties;
  options: readonly UiSelectOption[];
  value: string;
  active: number;
  isOpen: boolean;
  label: string | undefined;
  labelledBy: string | undefined;
  onPick: (index: number) => void;
  onHover: (index: number) => void;
}): ReactElement => (
  <div
    ref={attach}
    id={listId}
    className="ui-menu ui-select-menu"
    role={LISTBOX_ROLE}
    data-state={pick(isOpen, "open", "closed")}
    data-side={pick("bottom" in placement, "above", "below")}
    aria-label={label}
    aria-labelledby={labelledBy}
    style={placement}
  >
    {options.map((option, index) => (
      <UiSelectOptionRow
        key={option.value}
        option={option}
        index={index}
        listId={listId}
        isActive={index === active}
        isSelected={option.value === value}
        onPick={onPick}
        onHover={onHover}
      />
    ))}
  </div>
);

export { UiSelectMenu };
