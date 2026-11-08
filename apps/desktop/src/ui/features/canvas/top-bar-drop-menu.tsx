import { PORT_OPEN_EVENT } from "@design-studio/contracts/port";
import { lazy, useCallback, useEffect, useState } from "react";

import { uiStore } from "../../platform/storage.js";
import { setPortAvailable } from "../design-system/port-api.js";
import type { PortOpenDetail } from "../design-system/port-api.js";
import type { PortDialogTarget } from "../design-system/port-to-app-dialog.js";

const lazyPortToAppDialog = lazy(async () => {
  const loaded = await import("../design-system/port-to-app-dialog.js");

  return { default: loaded.PortToAppDialog };
});

interface PortDialog {
  target: PortDialogTarget | null;
  open: (frameId: string | null, directionId?: string | null) => void;
  close: () => void;
}

const usePortDialog = (available: boolean): PortDialog => {
  const [target, setTarget] = useState<PortDialogTarget | null>(null);

  const open = useCallback(
    (frameId: string | null, directionId?: string | null) => {
      const { activeProjectId: projectId, directionByProject } = uiStore.get();

      if (!projectId) {
        return;
      }

      setTarget({
        directionId: directionId ?? directionByProject[projectId] ?? null,
        frameId,
        projectId,
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

export { lazyPortToAppDialog, usePortDialog };
