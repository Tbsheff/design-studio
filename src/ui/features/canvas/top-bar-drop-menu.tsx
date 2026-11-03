import {
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { PORT_OPEN_EVENT } from "../../../shared/port.js";
import type { PortDialogTarget } from "../../components/PortToAppDialog.js";
import { setPortAvailable, type PortOpenDetail } from "../../portApi.js";
import { uiStore } from "../../storage.js";
import { type MenuGroup, MenuPopover } from "./top-bar-menu.js";

export const PortToAppDialog = lazy(async () => {
  const loaded = await import("../../components/PortToAppDialog.js");

  return { default: loaded.PortToAppDialog };
});

export function usePortDialog(available: boolean): {
  target: PortDialogTarget | null;
  open: (frameId: string | null, directionId?: string | null) => void;
  close: () => void;
} {
  const [target, setTarget] = useState<PortDialogTarget | null>(null);

  const open = useCallback(
    (frameId: string | null, directionId?: string | null) => {
      const { activeProjectId, directionByProject } = uiStore.get();

      if (!activeProjectId) {
        return;
      }

      setTarget({
        projectId: activeProjectId,
        directionId: directionId ?? directionByProject[activeProjectId] ?? null,
        frameId,
      });
    },
    []
  );

  useEffect(() => {
    setPortAvailable(available);

    return () => setPortAvailable(false);
  }, [available]);
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<PortOpenDetail>).detail;
      open(detail?.frameId ?? null, detail?.directionId ?? null);
    };

    window.addEventListener(PORT_OPEN_EVENT, onOpen);

    return () => window.removeEventListener(PORT_OPEN_EVENT, onOpen);
  }, [open]);

  return { target, open, close: useCallback(() => setTarget(null), []) };
}

export function DropMenu({
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
}) {
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

          setOpen((v) => !v);
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
}
