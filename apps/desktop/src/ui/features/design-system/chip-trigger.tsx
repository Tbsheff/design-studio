import type { ReactElement, ReactNode, RefObject } from "react";

const ChipTrigger = ({
  children,
  isOpen,
  name,
  onToggle,
  triggerRef,
}: {
  children: ReactNode;
  isOpen: boolean;
  name: string;
  onToggle: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}): ReactElement => (
  <button
    ref={triggerRef}
    type="button"
    className="btn ghost small ds-chip"
    aria-label={`Design system: ${name}`}
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    onClick={onToggle}
  >
    {children}
    <span className="ds-chip-name truncate">{name}</span>
  </button>
);

export { ChipTrigger };
