import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const Chip = ({
  icon,
  label,
  onRemove,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onRemove: () => void;
}): ReactElement => (
  <li className="nds-chip">
    <Icon name={icon} size={12} />
    <span className="truncate">{label}</span>
    <button
      type="button"
      className="icon-btn small"
      aria-label={`Remove ${label}`}
      onClick={onRemove}
    >
      <Icon name="close" size={12} />
    </button>
  </li>
);

export { Chip };
