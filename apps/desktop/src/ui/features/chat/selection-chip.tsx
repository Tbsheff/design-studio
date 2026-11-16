import type { SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { chipVariants } from "../../ai/components/ai/chip-variants.js";
import { cn } from "../../ai/lib/utils.js";
import { copy } from "./copy.js";
import {
  toSelectionSnippet,
  toSelectionTag,
  toSelectionTip,
} from "./selection-chip-model.js";

const CHIP_ICON = 12;

interface SelectionChipProps {
  readonly onRemove: (selector: string) => void;
  readonly selection: readonly SelectionContext[];
}

const SelectionChip = ({
  selection,
  onRemove,
}: SelectionChipProps): ReactElement => {
  const remove = useCallback((): void => {
    for (const selected of selection) {
      onRemove(selected.selector);
    }
  }, [onRemove, selection]);

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
      data-testid="selection-chip"
      data-tip={toSelectionTip(selection)}
      data-tip-side="top"
    >
      <Icon name="pointer" size={CHIP_ICON} />
      <span className="chip-text min-w-0 truncate">
        <span className="chip-tag font-mono font-bold">
          {toSelectionTag(selection)}
        </span>
        {toSelectionSnippet(selection)}
      </span>
      <button
        type="button"
        className="icon-btn chip-x"
        aria-label={copy.clearSelection}
        onClick={remove}
      >
        <Icon name="close" size={CHIP_ICON} />
      </button>
    </span>
  );
};

export { SelectionChip };
