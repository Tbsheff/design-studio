import { PORT_OPEN_EVENT } from "@design-studio/contracts/port";
import { lazy, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, ReactElement } from "react";

import { uiStore } from "../../platform/storage.js";
import { setPortAvailable } from "../design-system/port-api.js";
import type { PortOpenDetail } from "../design-system/port-api.js";
import type { PortDialogTarget } from "../design-system/port-to-app-dialog.js";
import { MenuPopover } from "./top-bar-menu.js";
import type { MenuGroup } from "./top-bar-menu.js";

const PortToAppDialog = lazy(async () => {
  const loaded = await import("../design-system/port-to-app-dialog.js");

  return { default: loaded.PortToAppDialog };
});

interface PortDialog {
  readonly target: PortDialogTarget | null;
  readonly open: (frameId: string | null, directionId?: string | null) => void;
  readonly close: () => void;
}

const usePortDialog = (isAvailable: boolean): PortDialog => {
  const [target, setTarget] = useState<PortDialogTarget | null>(null);

  const open = useCallback(
    (frameId: string | null, directionId?: string | null) => {
      const { activeProjectId, directionByProject } = uiStore.get();

      if (!activeProjectId) {
        return;
      }

      const resolvedDirectionId =
        directionId ?? directionByProject[activeProjectId] ?? null;

      const projectId = activeProjectId;
      const resolved = resolvedDirectionId;
      setTarget({ directionId: resolved, frameId, projectId });
    },
    []
  );

  useEffect(() => {
    setPortAvailable(isAvailable);

    return (): void => setPortAvailable(false);
  }, [isAvailable]);
  useEffect(() => {
    const onOpen = (event: Event): void => {
      const { detail } = event as CustomEvent<PortOpenDetail>;
      open(detail?.frameId ?? null, detail?.directionId ?? null);
    };

    globalThis.addEventListener(PORT_OPEN_EVENT, onOpen);

    return (): void => globalThis.removeEventListener(PORT_OPEN_EVENT, onOpen);
  }, [open]);

  return { close: useCallback(() => setTarget(null), []), open, target };
};

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

export { DropMenu, PortToAppDialog, usePortDialog };
