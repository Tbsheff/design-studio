import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const ChipRemoveButton = ({
  label,
  onRemove,
}: {
  readonly label: string;
  readonly onRemove: () => void;
}): ReactElement => (
  <button
    type="button"
    className="home-chip-remove"
    aria-label={label}
    onClick={onRemove}
  >
    <Icon name="close" size={12} />
  </button>
);

export { ChipRemoveButton };
