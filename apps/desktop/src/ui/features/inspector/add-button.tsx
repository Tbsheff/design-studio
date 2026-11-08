import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

interface Props {
  readonly label: string;
  readonly tip: string | null;
  readonly onClick: () => void;
}

const ICON_SIZE = 12;

const toTipAlign = (tip: string | null): string | null => {
  if (tip) {
    return "start";
  }

  return null;
};

const AddButton = ({ label, tip, onClick }: Props): ReactElement => (
  <button
    type="button"
    className="ins-add"
    aria-label={`Add ${label.toLowerCase()}`}
    data-tip={tip}
    data-tip-align={toTipAlign(tip)}
    onClick={onClick}
  >
    <Icon name="plus" size={ICON_SIZE} />
    {label}
  </button>
);

export { AddButton };
