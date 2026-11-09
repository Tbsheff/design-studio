import { Suspense, lazy, useCallback } from "react";
import type { ReactElement } from "react";

import { codeEditStore, useCodeEditTarget } from "./use-code-edit-target.js";

const CodeEditDialog = lazy(async () => {
  const loaded = await import("./code-edit-dialog.js");

  return { default: loaded.CodeEditDialog };
});

const CodeEditHost = (): ReactElement | null => {
  const target = useCodeEditTarget();

  const handleClose = useCallback((): void => {
    codeEditStore.set(null);
  }, []);

  if (target === null) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CodeEditDialog
        projectId={target.projectId}
        directionId={target.directionId}
        file={target.file}
        line={target.line}
        onClose={handleClose}
      />
    </Suspense>
  );
};

export { CodeEditHost };
