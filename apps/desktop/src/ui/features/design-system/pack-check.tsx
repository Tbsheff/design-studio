import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const ICON_SIZE = 12;

const PackCheck = ({
  isSelected,
}: {
  isSelected: boolean;
}): ReactElement | null => {
  if (!isSelected) {
    return null;
  }

  return (
    <span className="pack-check" aria-hidden="true">
      <Icon name="check" size={ICON_SIZE} />
    </span>
  );
};

export { PackCheck };
