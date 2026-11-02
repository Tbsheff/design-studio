import { lazy, Suspense, useCallback } from "react";
import type { ReactElement } from "react";

import type { CanvasFrame } from "./deps.js";

interface ImportPageSlotProps {
  readonly directionId: string;
  readonly frames: { readonly activate: (frame: CanvasFrame) => void };
  readonly onClose: () => void;
  readonly projectId: string;
  readonly zoom: { readonly zoomToActive?: () => void };
}

const ImportPageDialog = lazy(async () => {
  const dialog = await import("./import-page-dialog.js");

  return { default: dialog.ImportPageDialog };
});

const ImportPageSlot = (props: ImportPageSlotProps): ReactElement => {
  const { activate } = props.frames;
  const { zoomToActive } = props.zoom;

  const handleImported = useCallback(
    (frame: CanvasFrame): void => {
      activate(frame);
      zoomToActive?.();
    },
    [activate, zoomToActive]
  );

  return (
    <Suspense fallback={null}>
      <ImportPageDialog
        directionId={props.directionId}
        projectId={props.projectId}
        onClose={props.onClose}
        onImported={handleImported}
      />
    </Suspense>
  );
};

export { ImportPageSlot };

export type { ImportPageSlotProps };
