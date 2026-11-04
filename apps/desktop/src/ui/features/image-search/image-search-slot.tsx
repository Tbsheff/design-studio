import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { ImageSearchSheetProps } from "./image-search-sheet.js";

const ImageSearchSheet = lazy(async () => {
  const loaded = await import("./image-search-sheet.js");

  return { default: loaded.ImageSearchSheet };
});

const ImageSearchSlot = ({
  directionId,
  onClose,
  onDone,
  projectId,
  renderGenerate,
  target,
}: ImageSearchSheetProps): ReactElement => (
  <Suspense fallback={null}>
    <ImageSearchSheet
      renderGenerate={renderGenerate}
      directionId={directionId}
      projectId={projectId}
      target={target}
      onClose={onClose}
      onDone={onDone}
    />
  </Suspense>
);

export { ImageSearchSlot };
