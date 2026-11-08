import { useCallback, useRef, useState } from "react";
import type { ReactNode, ReactElement } from "react";

import { MenuPopover } from "./top-bar-menu.js";
import type { MenuGroup } from "./top-bar-menu.js";

const toAnchorClass = (anchorClass: string | null): string => {
  if (anchorClass) {
    return `topbar-anchor ${anchorClass}`;
  }

  return "topbar-anchor";
};

const toDataTip = (isOpen: boolean, tip: string | null): string | null => {
  if (isOpen) {
    return null;
  }

  return tip;
};

const toTipAlign = (align: "start" | "end"): "end" | null => {
  if (align !== "end") {
    return null;
  }

  return "end";
};

interface DropMenuProps {
  readonly label: string;
  readonly groups: () => MenuGroup[];
  readonly className: string;
  readonly anchorClass?: string;
  readonly align?: "start" | "end";
  readonly tip?: string;
  readonly children: ReactNode;
  readonly onOpen?: () => void;
}

const DropMenu = ({
  label,
  groups,
  className,
  anchorClass,
  align = "start",
  tip,
  children,
  onOpen,
}: DropMenuProps): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setIsOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  const toggle = useCallback(() => {
    if (!isOpen) {
      onOpen?.();
    }

    setIsOpen((value) => !value);
  }, [isOpen, onOpen]);

  return (
    <span className={toAnchorClass(anchorClass ?? null)}>
      <button
        ref={trigger}
        type="button"
        className={className}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        data-tip={toDataTip(isOpen, tip ?? null)}
        data-tip-align={toTipAlign(align)}
        onClick={toggle}
      >
        {children}
      </button>
      {isOpen && (
        <MenuPopover
          groups={groups()}
          label={label}
          align={align}
          onClose={close}
          trigger={trigger}
        />
      )}
    </span>
  );
};

export { DropMenu };
