import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent, ReactElement } from "react";

import { pick } from "./pick.js";
import { OPTION_ROLE } from "./ui-select-model.js";
import type { UiSelectOption } from "./ui-select-model.js";

const keepFocus = (event: MouseEvent<HTMLButtonElement>): void => {
  event.preventDefault();
};

const UiSelectOptionRow = ({
  option,
  index,
  listId,
  isActive,
  isSelected,
  onPick,
  onHover,
}: {
  option: UiSelectOption;
  index: number;
  listId: string;
  isActive: boolean;
  isSelected: boolean;
  onPick: (index: number) => void;
  onHover: (index: number) => void;
}): ReactElement => {
  const row = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isActive) {
      row.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

  const pickRow = useCallback(() => onPick(index), [onPick, index]);

  const hoverRow = useCallback(() => {
    if (!option.disabled) {
      onHover(index);
    }
  }, [option.disabled, onHover, index]);

  return (
    <button
      ref={row}
      type="button"
      id={`${listId}-${index}`}
      data-index={index}
      data-active={pick(isActive, "", null)}
      role={OPTION_ROLE}
      tabIndex={-1}
      aria-selected={isSelected}
      aria-disabled={option.disabled === true}
      className="ui-menu-item"
      onMouseDown={keepFocus}
      onMouseEnter={hoverRow}
      onClick={pickRow}
    >
      <span className="truncate">{option.label}</span>
    </button>
  );
};

export { UiSelectOptionRow };
