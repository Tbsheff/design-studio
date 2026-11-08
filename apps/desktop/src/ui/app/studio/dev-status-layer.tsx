import { Suspense, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  DEV_STATUS_MARK_EVENT,
  DEV_STATUS_OPEN_EVENT,
} from "../../domain/dev-status-events";
import { DevStatusDialog } from "../../features/dev-status";
import { toDevStatusRequest } from "./dev-status-model";
import type { DevStatusRequest } from "./dev-status-model";

interface DevStatusLayerProps {
  projectId: string;
}

const DevStatusLayer = ({ projectId }: DevStatusLayerProps): ReactNode => {
  const [request, setRequest] = useState<DevStatusRequest | null>(null);
  const handleClose = useCallback((): void => setRequest(null), []);

  useEffect(() => {
    const handleOpen = (): void =>
      setRequest(toDevStatusRequest(projectId, false));

    const handleMark = (): void =>
      setRequest(toDevStatusRequest(projectId, true));

    globalThis.addEventListener(DEV_STATUS_OPEN_EVENT, handleOpen);
    globalThis.addEventListener(DEV_STATUS_MARK_EVENT, handleMark);

    return (): void => {
      globalThis.removeEventListener(DEV_STATUS_OPEN_EVENT, handleOpen);
      globalThis.removeEventListener(DEV_STATUS_MARK_EVENT, handleMark);
    };
  }, [projectId]);

  if (request === null) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <DevStatusDialog
        frames={request.frames}
        markFrameId={request.markFrameId}
        onClose={handleClose}
        projectId={projectId}
      />
    </Suspense>
  );
};

export { DevStatusLayer };
