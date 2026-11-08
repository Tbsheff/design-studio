import { useCallback } from "react";

import { frameDirection } from "./canvas-direction-ops.js";
import { canvasStore, useCanvasLofi } from "./canvas-frames-model.js";
import type { ViewProps } from "./canvas-types.js";
import type { LofiSwitch, StageState } from "./canvas-wiring-inputs.js";
import { useLofiFrames } from "./lofi-frames-model.js";
import { useFrameChange } from "./use-stage-keys.js";

const useLofiSwitch = (
  props: ViewProps,
  text: StageState
): LofiSwitch | undefined => {
  const { projectId, directionId, kind } = props;
  const { stageRef, active, layout } = text;
  const lofiList = useCanvasLofi(projectId);
  useLofiFrames(stageRef, kind, directionId, lofiList);
  const liveDirection = frameDirection(active, directionId);

  const onToggle = useCallback((): void => {
    if (liveDirection) {
      canvasStore.setLofi(
        projectId,
        liveDirection,
        !lofiList.includes(liveDirection),
        layout
      );
    }
  }, [projectId, liveDirection, lofiList, layout]);

  if (liveDirection) {
    return { on: lofiList.includes(liveDirection), onToggle };
  }
};

const useFrameChangeReset = (props: ViewProps, text: StageState): void => {
  const { active, liveUrl } = text;

  useFrameChange(`${active.id}|${String(liveUrl)}`, () => {
    props.setSelection((prev) => {
      if (prev.length > 0) {
        return [];
      }

      return prev;
    });
    props.onFrameChange?.();
  });
};

export { useFrameChangeReset, useLofiSwitch };
