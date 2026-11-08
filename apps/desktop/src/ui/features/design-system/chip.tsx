import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const Chip = ({
  icon,
  label,
  value,
  onRemove,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  value: string;
  onRemove: (value: string) => void;
}): ReactElement => {
  const removeValue = useCallback(
    (): void => onRemove(value),
    [onRemove, value]
  );

  return (
    <li className="nds-chip">
      <Icon name={icon} size={12} />
      <span className="truncate">{label}</span>
      <button
        type="button"
        className="icon-btn small"
        aria-label={`${COPY.textRemove} ${label}`}
        onClick={removeValue}
      >
        <Icon name="close" size={12} />
      </button>
    </li>
  );
};

export { Chip };
