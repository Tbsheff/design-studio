import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import {
  setSelectionPictureOff,
  useSelectionPicture,
} from "../../../platform/selection-picture.js";
import { cn } from "../../lib/utils.js";
import { chipVariants } from "./chip-variants.js";

const CHIP_ICON = 12;

interface SelectionPictureChipProps {
  readonly count: number;
  readonly label: string;
  readonly removeLabel: string;
  readonly tip: string;
}

const SelectionPictureChip = ({
  count,
  label,
  removeLabel,
  tip,
}: SelectionPictureChipProps): ReactElement | null => {
  const isShown = useSelectionPicture(count);

  if (!isShown) {
    return null;
  }

  return (
    <span
      className={cn(
        chipVariants({
          className: "chip selection-picture-chip py-0.5 pr-0.5",
          size: "sm",
        })
      )}
      data-size="sm"
      data-slot="chip"
      data-tip={tip}
      data-tip-side="top"
    >
      <Icon name="image" size={CHIP_ICON} />
      <span className="chip-text min-w-0 truncate">{label}</span>
      <button
        type="button"
        className="icon-btn chip-x"
        aria-label={removeLabel}
        onClick={setSelectionPictureOff}
      >
        <Icon name="close" size={CHIP_ICON} />
      </button>
    </span>
  );
};

export { SelectionPictureChip };
