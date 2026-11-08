import { useCallback, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import type { MenuGroup } from "./top-bar-menu-model.js";
import { MenuPopover } from "./top-bar-menu.js";

interface DropMenuProps {
  label: string;
  groups: () => MenuGroup[];
  triggerClass: string;
  anchorClass?: string;
  align?: "start" | "end";
  tip?: string;
  children: ReactNode;
  onOpen?: () => void;
}

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
  if (align === "end") {
    return "end";
  }

  return null;
};

const DropMenu = ({
  label,
  groups,
  triggerClass,
  anchorClass,
  align = "start",
  tip,
  children,
  onOpen,
}: DropMenuProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  const toggle = useCallback(() => {
    if (!open) {
      onOpen?.();
    }

    setOpen((value) => !value);
  }, [open, onOpen]);

  return (
    <span className={toAnchorClass(anchorClass ?? null)}>
      <button
        ref={trigger}
        type="button"
        className={triggerClass}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={toDataTip(open, tip ?? null)}
        data-tip-align={toTipAlign(align)}
        onClick={toggle}
      >
        {children}
      </button>
      {open && (
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
