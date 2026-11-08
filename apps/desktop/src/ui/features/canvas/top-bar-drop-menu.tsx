import { PORT_OPEN_EVENT } from "@design-studio/contracts/port";
import { useCallback, useEffect, useState } from "react";

import { uiStore } from "../../platform/storage.js";
import { setPortAvailable } from "../design-system/port-api.js";
import type { PortOpenDetail } from "../design-system/port-api.js";
import type {
  PortDialogTarget,
  PortToAppDialog as PortToAppDialogView,
} from "../design-system/port-to-app-dialog.js";

const loadPortToAppDialog = async (): Promise<{
  default: typeof PortToAppDialogView;
}> => {
  const loaded = await import("../design-system/port-to-app-dialog.js");

  return { default: loaded.PortToAppDialog };
};

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

export { loadPortToAppDialog, usePortDialog };
