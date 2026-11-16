import { useMemo, useSyncExternalStore } from "react";

import { canvasStore } from "../../features/canvas/index";

type CanvasLayoutFrame = NonNullable<
  ReturnType<typeof canvasStore.get>
>["frames"][number];

const useMentionFrames = (
  projectId: string,
  directionId: string | null
): readonly CanvasLayoutFrame[] => {
  const layout = useSyncExternalStore(canvasStore.subscribe, () =>
    canvasStore.get(projectId)
  );

  return useMemo(
    () =>
      (layout?.frames ?? []).filter(
        (frame) => !frame.directionId || frame.directionId === directionId
      ),
    [directionId, layout]
  );
};

export { useMentionFrames };

export type { CanvasLayoutFrame };
