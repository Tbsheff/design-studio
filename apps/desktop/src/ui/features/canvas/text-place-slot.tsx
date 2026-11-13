import type { ReactElement } from "react";

import { heldTool } from "../../platform/canvas-tool.js";
import { useLive } from "../../platform/live-store.js";
import { TextPlaceLayer } from "./text-place-layer.js";
import type { VectorLayerProps } from "./vector-layer-types.js";
import { useVectorTool } from "./vector-tool-model.js";

const TextPlaceSlot = ({
  directionId,
  frame,
  listen,
  notify,
  page,
  post,
  projectId,
  zoom,
}: Omit<VectorLayerProps, "directionId"> & {
  readonly directionId: string | null;
}): ReactElement | null => {
  const held = useLive(heldTool);
  const { available } = useVectorTool();

  if (held !== "text" || !available || directionId === null) {
    return null;
  }

  return (
    <TextPlaceLayer
      projectId={projectId}
      directionId={directionId}
      zoom={zoom}
      frame={frame}
      post={post}
      listen={listen}
      notify={notify}
      page={page}
    />
  );
};

export { TextPlaceSlot };
