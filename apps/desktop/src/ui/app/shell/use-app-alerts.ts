import type { AppServerStatus } from "@design-studio/contracts";
import type { DoctorCause } from "@design-studio/contracts/app-doctor";
import { useCallback, useEffect, useRef, useState } from "react";

import { focusStageQuietly } from "../../features/canvas/use-inline-text-edit";
import { APP_PANEL_EVENT } from "../../platform/app-status";
import type { Tab } from "./app-tabs";

interface PanelFocus {
  readonly close: () => void;
  readonly remember: () => void;
}

interface AlertState {
  readonly cause: DoctorCause | null;
  readonly doctorKey: string | null;
  readonly failKey: string | null;
  readonly failed: boolean;
  readonly setHidden: (key: string | null) => void;
  readonly showDoctor: boolean;
}

const SWITCHABLE: readonly Tab[] = ["logs", "settings", "flow"];

const toTab = (value: string): Tab => {
  const found = SWITCHABLE.find((tab) => tab === value);

  return found ?? "routes";
};

const usePanelFocus = (setOpen: (open: boolean) => void): PanelFocus => {
  const opener = useRef<HTMLElement | null>(null);

  const remember = useCallback(() => {
    const active = document.activeElement;

    opener.current = null;

    if (active instanceof HTMLElement && active !== document.body) {
      opener.current = active;
    }
  }, []);

  const close = useCallback((): void => {
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
  }, [setOpen]);

  return { close, remember };
};

const useOpenRequests = (
  setTab: (tab: Tab) => void,
  setOpen: (open: boolean) => void,
  remember: () => void
): void => {
  useEffect(() => {
    const show = (event: Event): void => {
      remember();
      const next = (event as CustomEvent<string>).detail;
      setTab(toTab(next));
      setOpen(true);
    };

    globalThis.addEventListener(APP_PANEL_EVENT, show);

    return (): void => globalThis.removeEventListener(APP_PANEL_EVENT, show);
  }, [setTab, setOpen, remember]);
};

const toFailKey = (status: AppServerStatus | null): string | null => {
  if (status?.state === "failed") {
    return `${status.startedAt ?? 0}|${status.message ?? ""}`;
  }

  return null;
};

const toDoctorKey = (
  status: AppServerStatus | null,
  cause: DoctorCause | null
): string | null => {
  if (cause) {
    return `doctor|${status?.startedAt ?? 0}|${cause.kind}|${cause.title}`;
  }

  return null;
};

const useAlerts = (
  status: AppServerStatus | null,
  open: boolean
): AlertState => {
  const [hidden, setHidden] = useState<string | null>(null);

  const cause =
    status?.doctor?.causes.find((item) => item.severity === "error") ?? null;

  const doctorKey = toDoctorKey(status, cause);

  const showDoctor = doctorKey !== null && doctorKey !== hidden && !open;

  const failKey = toFailKey(status);

  const failed = failKey !== null && failKey !== hidden && !open && !showDoctor;

  return { cause, doctorKey, failKey, failed, setHidden, showDoctor };
};

export { usePanelFocus, useOpenRequests, useAlerts };
