import { Suspense, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { IMPACT_OPEN_EVENT } from "../../domain/impact-events";
import { ImpactDialog } from "../../features/impact/index.js";

interface ImpactLayerProps {
  directionId: string | null;
  projectId: string;
}

const ImpactLayer = ({
  directionId,
  projectId,
}: ImpactLayerProps): ReactNode => {
  const [file, setFile] = useState<string | null>(null);
  const handleClose = useCallback((): void => setFile(null), []);

  useEffect(() => {
    const handleOpen = (event: Event): void => {
      if (event instanceof CustomEvent) {
        setFile(String(event.detail ?? ""));
      }
    };

    globalThis.addEventListener(IMPACT_OPEN_EVENT, handleOpen);

    return (): void => {
      globalThis.removeEventListener(IMPACT_OPEN_EVENT, handleOpen);
    };
  }, []);

  if (file === null) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ImpactDialog
        directionId={directionId}
        file={file}
        onClose={handleClose}
        projectId={projectId}
      />
    </Suspense>
  );
};

export { ImpactLayer };
