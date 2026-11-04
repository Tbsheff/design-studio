import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { GallerySetup } from "./use-gallery.js";

interface GallerySlotProps extends GallerySetup {
  readonly onClose: () => void;
}

const GalleryPanel = lazy(async () => {
  const loaded = await import("./gallery-panel.js");

  return { default: loaded.GalleryPanel };
});

const GallerySlot = (props: GallerySlotProps): ReactElement => (
  <Suspense fallback={null}>
    <GalleryPanel
      component={props.component}
      directionId={props.directionId}
      file={props.file}
      onClose={props.onClose}
      projectId={props.projectId}
      target={props.target}
    />
  </Suspense>
);

export { GallerySlot };

export type { GallerySlotProps };
