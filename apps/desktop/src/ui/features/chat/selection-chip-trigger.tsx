import type { SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { toSnippet } from "./selection-chip-model.js";

const CHIP_ICON = 12;

interface SelectionChipTriggerProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly selected: SelectionContext;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}

const SelectionChipTrigger = ({
  isOpen,
  onToggle,
  selected,
  trigger,
}: SelectionChipTriggerProps): ReactElement => (
  <button
    ref={trigger}
    type="button"
    className="chip-menu-trigger flex min-w-0 items-center gap-1"
    aria-haspopup="menu"
    aria-expanded={isOpen}
    aria-label={`${copy.selectionOptions}: ${selected.selector}`}
    data-tip={selected.selector}
    data-tip-side="top"
    onClick={onToggle}
  >
    <Icon name="pointer" size={CHIP_ICON} />
    <span className="chip-text min-w-0 truncate font-mono">
      <span className="chip-tag font-bold">{selected.tag}</span>
      {toSnippet(selected)}
    </span>
  </button>
);

export { SelectionChipTrigger };
