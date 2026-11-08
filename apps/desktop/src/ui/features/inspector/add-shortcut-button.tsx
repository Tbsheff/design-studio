import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

interface Props {
  readonly label: string;
  readonly tip: string;
  readonly shortcut: string;
  readonly onClick: () => void;
}

const ICON_SIZE = 12;

const AddShortcutButton = ({
  label,
  tip,
  shortcut,
  onClick,
}: Props): ReactElement => (
  <button
    type="button"
    className="ins-add"
    aria-label={`Add ${label.toLowerCase()}`}
    aria-keyshortcuts={shortcut}
    data-tip={tip}
    data-tip-align="start"
    onClick={onClick}
  >
    <Icon name="plus" size={ICON_SIZE} />
    {label}
  </button>
);

export { AddShortcutButton };
