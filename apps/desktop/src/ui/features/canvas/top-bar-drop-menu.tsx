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

const usePortDialog = (
  available: boolean
): {
  target: PortDialogTarget | null;
  open: (frameId: string | null, directionId?: string | null) => void;
  close: () => void;
} => {
  const [target, setTarget] = useState<PortDialogTarget | null>(null);

  const open = useCallback(
    (frameId: string | null, directionId?: string | null) => {
      const { activeProjectId, directionByProject } = uiStore.get();

      if (!activeProjectId) {
        return;
      }

      setTarget({
        directionId: directionId ?? directionByProject[activeProjectId] ?? null,
        frameId,
        projectId: activeProjectId,
      });
    },
    []
  );

  useEffect(() => {
    setPortAvailable(available);

    return (): void => setPortAvailable(false);
  }, [available]);
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

const DropMenu = ({
  label,
  groups,
  className,
  anchorClass,
  align = "start",
  tip,
  children,
  onOpen,
}: {
  label: string;
  groups: () => MenuGroup[];
  className: string;
  anchorClass?: string;
  align?: "start" | "end";
  tip?: string;
  children: ReactNode;
  onOpen?: () => void;
}): ReactElement => {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  return (
    <span
      className={anchorClass ? `topbar-anchor ${anchorClass}` : "topbar-anchor"}
    >
      <button
        ref={trigger}
        type="button"
        className={className}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={open ? undefined : tip}
        data-tip-align={align === "end" ? "end" : undefined}
        onClick={() => {
          if (!open) {
            onOpen?.();
          }

          setOpen((value) => !value);
        }}
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

export { DropMenu, PortToAppDialog, usePortDialog };
