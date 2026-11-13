import { useCallback } from "react";
import type { ReactElement } from "react";

interface OverlayMenuItemProps {
  readonly isChecked: boolean;
  readonly label: string;
  readonly onClose: () => void;
  readonly onPick: () => void;
}

const OverlayMenuItem = ({
  isChecked,
  label,
  onClose,
  onPick,
}: OverlayMenuItemProps): ReactElement => {
  const choose = useCallback(() => {
    onPick();
    onClose();
  }, [onClose, onPick]);

  return (
    <button
      aria-checked={isChecked}
      className="ui-menu-item"
      role="menuitemcheckbox"
      type="button"
      onClick={choose}
    >
      <span>{label}</span>
    </button>
  );
};

export { OverlayMenuItem };
