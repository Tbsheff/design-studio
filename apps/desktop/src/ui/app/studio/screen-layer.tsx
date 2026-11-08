import { Suspense, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  SCREEN_CREATE_EVENT,
  SCREEN_DUPLICATE_EVENT,
} from "../../domain/screen-events";
import {
  ScreenDialog,
  ScreenDuplicateDialog,
} from "../../features/screen/index";
import { toCreateRequest, toDuplicateRequest } from "./screen-model";
import type { ScreenRequest } from "./screen-model";

interface ScreenLayerProps {
  projectId: string;
}

const ScreenLayer = ({ projectId }: ScreenLayerProps): ReactNode => {
  const [request, setRequest] = useState<ScreenRequest | null>(null);
  const handleClose = useCallback((): void => setRequest(null), []);

  useEffect(() => {
    const handleCreate = (): void => setRequest(toCreateRequest(projectId));

    const handleDuplicate = (event: Event): void =>
      setRequest(toDuplicateRequest(projectId, event));

    globalThis.addEventListener(SCREEN_CREATE_EVENT, handleCreate);
    globalThis.addEventListener(SCREEN_DUPLICATE_EVENT, handleDuplicate);

    return (): void => {
      globalThis.removeEventListener(SCREEN_CREATE_EVENT, handleCreate);
      globalThis.removeEventListener(SCREEN_DUPLICATE_EVENT, handleDuplicate);
    };
  }, [projectId]);

  if (request === null) {
    return null;
  }

  if (request.kind === "duplicate") {
    return (
      <Suspense fallback={null}>
        <ScreenDuplicateDialog
          directionId={request.directionId}
          from={request.from}
          onClose={handleClose}
          projectId={projectId}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <ScreenDialog
        directionId={request.directionId}
        initialPath=""
        onClose={handleClose}
        projectId={projectId}
      />
    </Suspense>
  );
};

export { ScreenLayer };
