import { Suspense, useMemo } from "react";

import { HTML_FRAME_SANDBOX } from "../../bridge.js";
import { MatrixSlot, useFindHost } from "../../canvas-slots.js";
import {
  canvasStore,
  frameDirection,
  useCanvasLofi,
} from "../../canvasFrames.js";
import type { CanvasFrame } from "../../canvasFrames.js";
import { appRoutePages, useAppCanvas } from "../../components/AppCanvas.js";
import type { FrameMenuItem } from "../../components/FrameControls.js";
import { useLofiFrames } from "../../lofiFrames.js";
import { useFrameActions } from "../../useCanvasFrames.js";
import { useClickThrough } from "../../useClickThrough.js";
import { usePrototype } from "../../usePrototype.js";
import {
  frameLabelOf,
  jumpToFrame,
  shellDirectionName,
  stageCursor,
  themeSwitch,
} from "./canvas-helpers.js";
import type { ViewProps } from "./canvas-types.js";
import type { useCanvasEdits } from "./use-canvas-edits.js";
import type { useCanvasPreview } from "./use-canvas-preview.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import { useFrameLabels } from "./use-frame-labels.js";
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
        id: "states",
        label: "Make states",
        icon: "layers",
        run: () => make(frame),
        ...(blocked ? { disabled: blocked } : {}),
      },
    ];
  };

  const labelProps = useFrameLabels({
    projectId,
    kind,
    directionId,
    activeId: active.id,
    directions: props.directions,
    selection: props.selection,
    setSelection: props.setSelection,
    frames: canvasFrames,
    baseLabel,
    directionName: shellDirectionName(props.shell),
    frameActions,
    appPages: appRoutePages(projectId, props.app),
  });

  const proto = usePrototype({
    projectId,
    kind,
    directionId,
    frames: layout.frames,
    shown,
    active,
    baseUrl,
    live,
    selection: props.selection,
    clearSelection: () => props.setSelection(() => []),
    sandbox,
    notify: layerEdits.notify,
    on: protoOn,
    preview: frames,
    passive,
  });

  const findHost = useFindHost({
    enabled: directionId !== null,
    frames: canvasFrames,
    post: frames.post,
  });

  const commandsInput = {
    live,
    hasHead: headVersionId !== null,
    zoomBy,
    selectMode,
    setSelectMode,
    comment,
    draw,
    layersOpen,
    onLayers: toggleEdit,
    onSource: props.onSource,
    dark: darkSwitch,
    lofi: lofiSwitch,
    check,
    play: proto.play,
  };

  const appCanvas = useAppCanvas({
    projectId,
    app: props.app,
    listen: frames.listen,
    resetKey: `${active.id}|${String(liveUrl)}`,
    frames: canvasFrames,
    freeze: pz.freeze,
    focus: pz.zoomToActive,
    notify: layerEdits.notify,
    size: viewport,
    onSignIn: () => {
      setSelectMode(false);
      setProtoOn(false);
      comment.setOn(false);
      requestAnimationFrame(() =>
        artboardRef.current?.querySelector("iframe")?.focus()
      );
    },
  });

  const capture = pz.spaceHeld || pz.panning || pz.zoomHeld;
  const stageMode = stageCursor(pz);

  const matrixSlot = useMemo(
    () => (
      <Suspense fallback={null}>
        <MatrixSlot
          projectId={projectId}
          directionId={directionId}
          frame={active}
          frameLabelOf={frameLabelOf}
          onJumpToFrame={jumpToFrame}
        />
      </Suspense>
    ),
    [active, directionId, projectId]
  );

  return {
    darkSwitch,
    lofiSwitch,
    sandbox,
    registerPassive,
    addFrameAt,
    undoRemove,
    dismissUndo,
    onResizeStart,
    labelProps,
    proto,
    findHost,
    commandsInput,
    appCanvas,
    capture,
    stageMode,
    matrixSlot,
  };
};

export { useCanvasWiring };
