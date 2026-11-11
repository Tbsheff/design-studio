import { Suspense, useCallback } from "react";
import type { ReactNode } from "react";

import { PrototypeDialog } from "../features/prototype/index.js";
import { useLive } from "../platform/live-store.js";
import {
  closePrototypeDialog,
  prototypeDialog,
} from "../platform/prototype-dialog.js";
import { openProject } from "./project-nav.js";

const PrototypeLayer = (): ReactNode => {
  const appProjectId = useLive(prototypeDialog);

  const handleCreated = useCallback((projectId: string): void => {
    closePrototypeDialog();
    openProject(projectId);
  }, []);

  if (appProjectId === null) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <PrototypeDialog
        key={appProjectId}
        appProjectId={appProjectId}
        onClose={closePrototypeDialog}
        onCreated={handleCreated}
      />
    </Suspense>
  );
};

export { PrototypeLayer };
