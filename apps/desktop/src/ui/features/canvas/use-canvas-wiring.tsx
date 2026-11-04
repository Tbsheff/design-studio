import { HTML_FRAME_SANDBOX } from "../../platform/bridge.js";
import { appRoutePages } from "./app-canvas-routes.js";
import { useAppCanvas } from "./app-canvas.js";
import {
  canvasStore,
  frameDirection,
  useCanvasLofi,
} from "./canvas-frames-model.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import {
  shellDirectionName,
  stageCursor,
  themeSwitch,
} from "./canvas-helpers.js";
import type { ViewProps } from "./canvas-types.js";
import type { FrameMenuItem } from "./frame-more-menu.js";
import { useLofiFrames } from "./lofi-frames-model.js";
import type { useCanvasEdits } from "./use-canvas-edits.js";
import { useFrameActions } from "./use-canvas-frames.js";
import type { useCanvasPreview } from "./use-canvas-preview.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import { useClickThrough } from "./use-click-through.js";
import { useFrameLabels } from "./use-frame-labels.js";
import { usePrototype } from "./use-prototype.js";
import { useFrameChange } from "./use-stage-keys.js";

const useCanvasWiring = (
  props: ViewProps,
  s: ReturnType<typeof useCanvasStage>,
  pv: ReturnType<typeof useCanvasPreview>,
  ed: ReturnType<typeof useCanvasEdits>
) => {
  const { projectId, directionId, kind, headVersionId } = props;

  const {
    stageRef,
    artboardRef,
    canvasFrames,
    layout,
    active,
    shown,
    viewport,
    pz,
    zoomBy,
    selectMode,
    setSelectMode,
    check,
    comment,
    live,
    protoOn,
    setProtoOn,
    layersOpen,
    toggleEdit,
    picking,
    draw,
    baseUrl,
    liveUrl,
  } = s;

  const { frames, passive, theme } = pv;
  const { layerEdits } = ed;
  const lofiList = useCanvasLofi(projectId);
  useLofiFrames(stageRef, kind, directionId, lofiList);
  const liveDirection = frameDirection(active, directionId);

  const lofiSwitch = liveDirection
    ? {
        on: lofiList.includes(liveDirection),
        onToggle: () =>
          canvasStore.setLofi(
            projectId,
            liveDirection,
            !lofiList.includes(liveDirection),
            layout
          ),
      }
    : undefined;

  const darkSwitch = themeSwitch(props.darkPreview, theme);

  const sandbox = kind === "html" ? HTML_FRAME_SANDBOX : undefined;
  const clickThrough = useClickThrough(frames, picking);
  useFrameChange(`${active.id}|${String(liveUrl)}`, () => {
    props.setSelection((prev) => (prev.length > 0 ? [] : prev));
    props.onFrameChange?.();
  });

  const {
    labelProps: baseLabel,
    registerPassive,
    addFrameAt,
    undoRemove,
    dismissUndo,
    onResizeStart,
  } = useFrameActions(canvasFrames, pz, artboardRef, clickThrough);

  const frameActions = (
    frame: CanvasFrame,
    did: string | null
  ): FrameMenuItem[] => {
    const make = props.onMakeStates;

    if (!make) {
      return [];
    }

    const blocked = props.running
      ? "A run is going."
      : did === directionId
        ? undefined
        : "Open this direction first.";

    return [
      {
        icon: "layers",
        id: "states",
        label: "Make states",
        run: () => make(frame),
        ...(blocked ? { disabled: blocked } : {}),
      },
    ];
  };

  const labelProps = useFrameLabels({
    activeId: active.id,
    appPages: appRoutePages(projectId, props.app),
    baseLabel,
    directionId,
    directionName: shellDirectionName(props.shell),
    directions: props.directions,
    frameActions,
    frames: canvasFrames,
    kind,
    projectId,
    selection: props.selection,
    setSelection: props.setSelection,
  });

  const proto = usePrototype({
    active,
    baseUrl,
    clearSelection: () => props.setSelection(() => []),
    directionId,
    frames: layout.frames,
    kind,
    live,
    notify: layerEdits.notify,
    on: protoOn,
    passive,
    preview: frames,
    projectId,
    sandbox,
    selection: props.selection,
    shown,
  });

  const commandsInput = {
    check,
    comment,
    dark: darkSwitch,
    draw,
    hasHead: headVersionId !== null,
    layersOpen,
    live,
    lofi: lofiSwitch,
    onLayers: toggleEdit,
    onSource: props.onSource,
    play: proto.play,
    selectMode,
    setSelectMode,
    zoomBy,
  };

  const appCanvas = useAppCanvas({
    app: props.app,
    focus: pz.zoomToActive,
    frames: canvasFrames,
    freeze: pz.freeze,
    listen: frames.listen,
    notify: layerEdits.notify,
    onSignIn: () => {
      setSelectMode(false);
      setProtoOn(false);
      comment.setOn(false);
      requestAnimationFrame(() =>
        artboardRef.current?.querySelector("iframe")?.focus()
      );
    },
    projectId,
    resetKey: `${active.id}|${String(liveUrl)}`,
    size: viewport,
  });

  const capture = pz.spaceHeld || pz.panning || pz.zoomHeld;
  const stageMode = stageCursor(pz);

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
    sandbox,
    stageMode,
    undoRemove,
  };
};

export { useCanvasWiring };
