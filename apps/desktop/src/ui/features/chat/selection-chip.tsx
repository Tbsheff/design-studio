import type { SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { chipVariants } from "../../ai/components/ai/chip-variants.js";
import { cn } from "../../ai/lib/utils.js";
import { SelectionChipMenu } from "./selection-chip-menu.js";
import { SelectionChipTrigger } from "./selection-chip-trigger.js";
import type { RunFocus } from "./use-run-focus.js";
import { useSelectionChipMenu } from "./use-selection-chip-menu.js";

const CHIP_ICON = 12;

interface SelectionChipProps {
  readonly count: number;
  readonly focus: RunFocus;
  readonly onRemove: (selector: string) => void;
  readonly selected: SelectionContext;
}

const SelectionChip = ({
  count,
  focus,
  selected,
  onRemove,
}: SelectionChipProps): ReactElement => {
  const chip = useSelectionChipMenu(selected, count, focus);
  const { menu, trigger } = chip;
  const { toggle: handleToggle } = menu;

  const remove = useCallback((): void => {
    onRemove(selected.selector);
  }, [onRemove, selected.selector]);

  return (
    <span
      className={cn(
        chipVariants({
          className: "chip max-w-full py-0.5 pr-0.5 text-primary",
          size: "sm",
        })
      )}
      data-size="sm"
      data-slot="chip"
    >
      <SelectionChipTrigger
        isOpen={menu.open}
        selected={selected}
        trigger={trigger}
        onToggle={handleToggle}
      />
      <button
        type="button"
        className="icon-btn chip-x"
        aria-label={`Remove ${selected.selector}`}
        onClick={remove}
      >
        <Icon name="close" size={CHIP_ICON} />
      </button>
      <SelectionChipMenu chip={chip} />
    </span>
  );
};

export { SelectionChip };
