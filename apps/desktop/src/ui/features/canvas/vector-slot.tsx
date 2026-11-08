import { Suspense, lazy } from "react";
import type { ComponentProps, ReactElement } from "react";

import { useVectorTool } from "./vector-tool-model.js";

const VectorLayer = lazy(async () => {
  const loaded = await import("./vector-layer.js");

  return { default: loaded.VectorLayer };
});

const VectorSlot = ({
  directionId,
  frame,
  listen,
  notify,
  page,
  post,
  projectId,
  zoom,
}: Omit<ComponentProps<typeof VectorLayer>, "directionId"> & {
  directionId: string | null;
}): ReactElement | null => {
  const { available } = useVectorTool();

  if (!available || !directionId) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <VectorLayer
        projectId={projectId}
        directionId={directionId}
        zoom={zoom}
        frame={frame}
        post={post}
        listen={listen}
        notify={notify}
        page={page}
      />
    </Suspense>
  );
};

export { VectorSlot };
