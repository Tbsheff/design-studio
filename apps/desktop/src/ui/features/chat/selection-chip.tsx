import type { SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { chipVariants } from "../../ai/components/ai/chip-variants.js";
import { cn } from "../../ai/lib/utils.js";
import { toSnippet } from "./selection-chip-model.js";

const CHIP_ICON = 12;

interface SelectionChipProps {
  readonly onRemove: (selector: string) => void;
  readonly selected: SelectionContext;
}

const SelectionChip = ({
  selected,
  onRemove,
}: SelectionChipProps): ReactElement => {
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
      data-tip={selected.selector}
      data-tip-side="top"
    >
      <Icon name="pointer" size={CHIP_ICON} />
      <span className="chip-text min-w-0 truncate font-mono">
        <span className="chip-tag font-bold">{selected.tag}</span>
        {toSnippet(selected)}
      </span>
      <button
        type="button"
        className="icon-btn chip-x"
        aria-label={`Remove ${selected.selector}`}
        onClick={remove}
      >
        <Icon name="close" size={CHIP_ICON} />
      </button>
    </span>
  );
};

export { SelectionChip };
