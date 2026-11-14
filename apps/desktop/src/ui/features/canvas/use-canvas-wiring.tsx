import { useAppCanvas } from "./app-canvas.js";
import { stageCursor, themeSwitch } from "./canvas-helpers.js";
import type { ViewProps } from "./canvas-types.js";
import {
  toAppCanvasInput,
  toCommandsInput,
  toLabelInput,
  toPrototypeInput,
  toSandbox,
} from "./canvas-wiring-inputs.js";
import type {
  CanvasWiring,
  EditsState,
  PreviewState,
  StageState,
} from "./canvas-wiring-inputs.js";
import { addSectionAround } from "./use-canvas-sections.js";
import {
  useFrameChangeReset,
  useLofiSwitch,
  useStageOpenSteps,
  useOutlineSwitch,
} from "./use-canvas-wiring-parts.js";
import { useClickThrough } from "./use-click-through.js";
import { useFrameActions } from "./use-frame-actions.js";
import { useFrameLabels } from "./use-frame-labels.js";
import { useFrameSelectionKeys } from "./use-frame-selection.js";
import { usePrototype } from "./use-prototype.js";

const useCanvasWiring = (
  props: ViewProps,
  text: StageState,
  pv: PreviewState,
  ed: EditsState
): CanvasWiring => {
  const { artboardRef, canvasFrames, pz, picking } = text;
  const lofiSwitch = useLofiSwitch(props, text);
  const outlineSwitch = useOutlineSwitch(props, text);
  useStageOpenSteps(props, text);
  const darkSwitch = themeSwitch(Boolean(props.darkPreview), pv.theme);
  const sandbox = toSandbox(props.kind);
  const clickThrough = useClickThrough(pv.frames, picking);
  useFrameChangeReset(props, text);

  const {
    labelProps: baseLabel,
    registerPassive,
    addFrameAt,
    undoRemove,
    dismissUndo,
    onResizeStart,
    removeFramesAt,
    removedCount,
  } = useFrameActions(canvasFrames, pz, artboardRef, clickThrough);

  const { setSelection } = props;
  const selectionCount = props.selection.length;

  useFrameSelectionKeys({
    clearLayers: () => setSelection(() => []),
    frames: canvasFrames,
    isBlocked: text.protoOn || text.draw.on,
    removeFramesAt,
    selectSiblings: () =>
      pv.frames.selectRelative(props.selection[0]?.selector ?? "", "siblings"),
    selectionCount,
  });

  const labelProps = useFrameLabels(toLabelInput(props, text, baseLabel));
  const proto = usePrototype(toPrototypeInput(props, text, pv, ed));
  const appCanvas = useAppCanvas(toAppCanvasInput(props, text, pv, ed));
  const capture = pz.spaceHeld || pz.panning || pz.zoomHeld;
  const stageMode = stageCursor(pz);

  const activeId = text.active.id;

  const commandsInput = toCommandsInput(text, {
    addSection: () => {
      addSectionAround(props.projectId, [activeId]);
    },
    dark: darkSwitch,
    hasHead: props.headVersionId !== null,
    lofi: lofiSwitch,
    onSource: props.onSource,
    outline: outlineSwitch,
    play: proto.play,
  });

  return {
    addFrameAt,
    appCanvas,
    capture,
    commandsInput,
    darkSwitch,
    dismissUndo,
    labelProps,
    lofiSwitch,
    onResizeStart,
    proto,
    registerPassive,
    removeFramesAt,
    removedCount,
    sandbox,
    stageMode,
    undoRemove,
  };
};

export { useCanvasWiring };
