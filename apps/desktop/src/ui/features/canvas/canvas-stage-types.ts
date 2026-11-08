import type { StageSlots, ViewProps } from "./canvas-types.js";
import type { useCanvasEdits } from "./use-canvas-edits.js";
import type { useCanvasPreview } from "./use-canvas-preview.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import type { useCanvasWiring } from "./use-canvas-wiring.js";

interface CanvasStageProps {
  props: ViewProps;
  stage: ReturnType<typeof useCanvasStage>;
  preview: ReturnType<typeof useCanvasPreview>;
  edits: ReturnType<typeof useCanvasEdits>;
  wiring: ReturnType<typeof useCanvasWiring>;
}

interface StageSlotProps extends CanvasStageProps {
  slots: StageSlots;
  variant: string;
}

export type { CanvasStageProps, StageSlotProps };
