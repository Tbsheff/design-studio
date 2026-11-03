import { useCallback, useEffect, useRef, useState } from "react";

import type { AppServerStatus } from "../../../shared/contracts";
import { focusStageQuietly } from "../../features/canvas/use-inline-text-edit";
import { APP_PANEL_EVENT } from "../../platform/app-status";
import type { Tab } from "./app-tabs";

function usePanelFocus(setOpen: (open: boolean) => void) {
  const opener = useRef<HTMLElement | null>(null);

  const remember = useCallback(() => {
    const active = document.activeElement;
    opener.current =
      active instanceof HTMLElement && active !== document.body ? active : null;
  }, []);

  const close = () => {
    setOpen(false);
    const back = opener.current;
    requestAnimationFrame(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        return;
      }

      if (back?.isConnected) {
        back.focus();
      } else {
        focusStageQuietly();
      }
    });
  };

  return { remember, close };
}

function useOpenRequests(
  setTab: (tab: Tab) => void,
  setOpen: (open: boolean) => void,
  remember: () => void
): void {
  useEffect(() => {
    const show = (event: Event) => {
      remember();
      const next = (event as CustomEvent<unknown>).detail;
      setTab(
        next === "logs" || next === "settings" || next === "flow"
          ? next
          : "routes"
      );
      setOpen(true);
    };

    window.addEventListener(APP_PANEL_EVENT, show);

    return () => window.removeEventListener(APP_PANEL_EVENT, show);
  }, [setTab, setOpen, remember]);
}

function useAlerts(status: AppServerStatus | null, open: boolean) {
  const [hidden, setHidden] = useState<string | null>(null);

  const cause =
    status?.doctor?.causes.find((item) => item.severity === "error") ?? null;

  const doctorKey = cause
    ? `doctor|${status?.startedAt ?? 0}|${cause.kind}|${cause.title}`
    : null;

  const showDoctor = doctorKey !== null && doctorKey !== hidden && !open;

  const failKey =
    status?.state === "failed"
      ? `${status.startedAt ?? 0}|${status.message ?? ""}`
      : null;

  const failed = failKey !== null && failKey !== hidden && !open && !showDoctor;

  return { cause, doctorKey, showDoctor, failKey, failed, setHidden };
}

export { usePanelFocus, useOpenRequests, useAlerts };
