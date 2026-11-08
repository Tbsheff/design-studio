import type { Direction, Project } from "@design-studio/contracts";
import { useSyncExternalStore } from "react";

import { canvasStore } from "./canvas-frames-model.js";
import { framesOnCanvas } from "./canvas-variations-model.js";
import type { VariationsState } from "./use-variations.js";
import { groupOf } from "./variations-api.js";

const useShownGroup = (
  project: Project,
  state: VariationsState,
  direction: Direction | null
): Direction[] => {
  const groupId = direction?.variation?.groupId ?? state.groupId;
  const group = groupOf(project, groupId);
  const ids = group.map((member) => member.id);

  const onCanvas = useSyncExternalStore(canvasStore.subscribe, () =>
    framesOnCanvas(project.id, ids)
  );

  if (direction?.variation || onCanvas > 0) {
    return group;
  }

  return [];
};

export { useShownGroup };
