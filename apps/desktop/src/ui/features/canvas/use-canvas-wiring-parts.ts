import { useCallback } from "react";

import { frameDirection } from "./canvas-direction-ops.js";
import { canvasStore, useCanvasLofi } from "./canvas-frames-model.js";
import type { ViewProps } from "./canvas-types.js";
import type { LofiSwitch, StageState } from "./canvas-wiring-inputs.js";
import { useLofiFrames } from "./lofi-frames-model.js";
import { useOpenSteps } from "./use-open-steps.js";
import { useOutlineView } from "./use-outline-view.js";
import type { OutlineSwitch } from "./use-outline-view.js";
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

const useOutlineSwitch = (props: ViewProps, text: StageState): OutlineSwitch =>
  useOutlineView(text.stageRef, props.kind, props.directionId, props.projectId);

const useOpenStepsSync = (props: ViewProps, text: StageState): void =>
  useOpenSteps(text.stageRef, props.kind, props.directionId, props.selection);

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

export {
  useFrameChangeReset,
  useLofiSwitch,
  useOpenStepsSync,
  useOutlineSwitch,
};
