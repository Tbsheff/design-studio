import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const AppChipRemove = ({
  name,
  onRemove,
}: {
  readonly name: string;
  readonly onRemove: () => void;
}): ReactElement => (
  <button
    type="button"
    className="home-chip-remove"
    aria-label={`Remove ${name}`}
    onClick={onRemove}
  >
    <Icon name="close" size={12} />
  </button>
);

export { AppChipRemove };
