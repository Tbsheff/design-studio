import { Icon } from "@design-studio/ui";
import type { ReactElement, RefObject } from "react";

const TRIGGER_TIP = "Select or replace";

const MatchMenuTrigger = ({
  triggerRef,
  isOpen,
  label,
  onToggle,
}: {
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly isOpen: boolean;
  readonly label: string;
  readonly onToggle: () => void;
}): ReactElement => {
  if (isOpen) {
    return (
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn small"
        aria-haspopup="menu"
        aria-expanded
        aria-label={label}
        data-tip-align="end"
        onClick={onToggle}
      >
        <Icon name="more" size={14} />
      </button>
    );
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      className="icon-btn small"
      aria-haspopup="menu"
      aria-expanded={false}
      aria-label={label}
      data-tip={TRIGGER_TIP}
      data-tip-align="end"
      onClick={onToggle}
    >
      <Icon name="more" size={14} />
    </button>
  );
};

export { MatchMenuTrigger };
