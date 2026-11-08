import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement, ReactNode } from "react";

import { createLiveStore, useLive } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { ArtboardOverlay } from "./artboard-overlay.js";
import { overlayHover } from "./canvas-helpers.js";
import type { HoverBox } from "./preview-rect-model.js";
import { useResizeLive } from "./use-resize-handles.js";
import type { ResizeHandles } from "./use-resize-handles.js";

interface LiveOverlayProps {
  readonly hover: LiveStore<HoverBox | null>;
  readonly picked: LiveStore<SelectionContext[] | null>;
  readonly commenting: boolean;
  readonly picking: boolean;
  readonly resize: ResizeHandles;
  readonly selection: SelectionContext[];
  readonly comments: ReactNode;
  readonly spacing?: ReactNode;
  readonly zoom: number;
}

const NO_PICK = createLiveStore<SelectionContext[] | null>(null);

const toPickedStore = (
  picked: LiveStore<SelectionContext[] | null>,
  isCommenting: boolean
): LiveStore<SelectionContext[] | null> => {
  if (isCommenting) {
    return NO_PICK;
  }

  return picked;
};

const LiveOverlay = ({
  hover,
  picked,
  commenting,
  picking,
  resize,
  selection,
  comments,
  spacing,
  zoom,
}: LiveOverlayProps): ReactElement => {
  const box = useLive(hover);
  const early = useLive(toPickedStore(picked, commenting));
  const control = useResizeLive(resize);

  return (
    <ArtboardOverlay
      comments={comments}
      spacing={spacing}
      zoom={zoom}
      selection={early ?? selection}
      hover={overlayHover(box, picking)}
      resize={control}
    />
  );
};

export { LiveOverlay };
