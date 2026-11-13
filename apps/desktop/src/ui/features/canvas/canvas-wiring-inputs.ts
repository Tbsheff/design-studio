import { HTML_FRAME_SANDBOX } from "../../platform/bridge.js";
import type { useAppCanvas } from "./app-canvas.js";
import { appRoutePages } from "./app-route-pages.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { commentToolsOf, shellDirectionName } from "./canvas-helpers.js";
import type { stageCursor, themeSwitch } from "./canvas-helpers.js";
import type { ViewProps } from "./canvas-types.js";
import type { FrameMenuItem } from "./frame-more-menu.js";
import type { PlayCommentOptions } from "./play-comment-types.js";
import type { useCanvasEdits } from "./use-canvas-edits.js";
import type { useCanvasPreview } from "./use-canvas-preview.js";
import type { useCanvasStage } from "./use-canvas-stage.js";
import type { useFrameActions } from "./use-frame-actions.js";
import type { useFrameLabels } from "./use-frame-labels.js";
import type { usePrototype } from "./use-prototype.js";

type StageState = ReturnType<typeof useCanvasStage>;

type PreviewState = ReturnType<typeof useCanvasPreview>;

type EditsState = ReturnType<typeof useCanvasEdits>;

type FrameActions = ReturnType<typeof useFrameActions>;

type FrameSandbox = typeof HTML_FRAME_SANDBOX;

type BlockedReason = "A run is going." | "Open this direction first.";

type LabelInput = Parameters<typeof useFrameLabels>[0];

type PrototypeInput = Parameters<typeof usePrototype>[0];

type AppCanvasInput = Parameters<typeof useAppCanvas>[0];

interface LofiSwitch {
  readonly on: boolean;
  readonly onToggle: () => void;
}

interface CommandsInput {
  readonly addSection: () => void;
  readonly check: StageState["check"];
  readonly comment: StageState["comment"];
  readonly dark: ReturnType<typeof themeSwitch>;
  readonly draw: StageState["draw"];
  readonly hasHead: boolean;
  readonly layersOpen: StageState["layersOpen"];
  readonly live: StageState["live"];
  readonly lofi: LofiSwitch | undefined;
  readonly onLayers: StageState["toggleEdit"];
  readonly onSource: ViewProps["onSource"];
  readonly outline: LofiSwitch;
  readonly play: ReturnType<typeof usePrototype>["play"];
  readonly selectMode: StageState["selectMode"];
  readonly setSelectMode: StageState["setSelectMode"];
  readonly zoomBy: StageState["zoomBy"];
}

interface CommandsExtras {
  readonly addSection: CommandsInput["addSection"];
  readonly dark: CommandsInput["dark"];
  readonly hasHead: boolean;
  readonly lofi: LofiSwitch | undefined;
  readonly onSource: ViewProps["onSource"];
  readonly outline: LofiSwitch;
  readonly play: CommandsInput["play"];
}

interface CanvasWiring {
  readonly addFrameAt: FrameActions["addFrameAt"];
  readonly appCanvas: ReturnType<typeof useAppCanvas>;
  readonly capture: boolean;
  readonly commandsInput: CommandsInput;
  readonly darkSwitch: ReturnType<typeof themeSwitch>;
  readonly dismissUndo: FrameActions["dismissUndo"];
  readonly labelProps: ReturnType<typeof useFrameLabels>;
  readonly lofiSwitch: LofiSwitch | undefined;
  readonly onResizeStart: FrameActions["onResizeStart"];
  readonly proto: ReturnType<typeof usePrototype>;
  readonly registerPassive: FrameActions["registerPassive"];
  readonly removedCount: FrameActions["removedCount"];
  readonly sandbox: FrameSandbox | undefined;
  readonly stageMode: ReturnType<typeof stageCursor>;
  readonly undoRemove: FrameActions["undoRemove"];
}

const toSandbox = (kind: ViewProps["kind"]): FrameSandbox | undefined => {
  if (kind === "html") {
    return HTML_FRAME_SANDBOX;
  }
};

const toBlockedReason = (
  props: ViewProps,
  frameDirectionId: string | null
): BlockedReason | undefined => {
  if (props.running) {
    return "A run is going.";
  }

  if (frameDirectionId !== props.directionId) {
    return "Open this direction first.";
  }
};

const toFrameActions = (
  props: ViewProps,
  frame: CanvasFrame,
  frameDirectionId: string | null
): FrameMenuItem[] => {
  const make = props.onMakeStates;

  if (!make) {
    return [];
  }

  const item: FrameMenuItem = {
    icon: "layers",
    id: "states",
    label: "Make states",
    run: () => make(frame),
  };

  const blocked = toBlockedReason(props, frameDirectionId);

  if (blocked) {
    item.disabled = blocked;
  }

  return [item];
};

const toCommandsInput = (
  text: StageState,
  extras: CommandsExtras
): CommandsInput => {
  const { check, comment, draw, layersOpen, live, selectMode } = text;
  const { setSelectMode, zoomBy } = text;
  const onLayers = text.toggleEdit;
  const { addSection, dark, hasHead, lofi, onSource, outline, play } = extras;

  return {
    addSection,
    check,
    comment,
    dark,
    draw,
    hasHead,
    layersOpen,
    live,
    lofi,
    onLayers,
    onSource,
    outline,
    play,
    selectMode,
    setSelectMode,
    zoomBy,
  };
};

const toLabelInput = (
  props: ViewProps,
  text: StageState,
  baseLabel: LabelInput["baseLabel"]
): LabelInput => {
  const { projectId, directionId, kind, selection, setSelection } = props;
  const { directions } = props;
  const activeId = text.active.id;
  const appPages = appRoutePages(projectId, props.app);
  const directionName = shellDirectionName(props.shell);
  const frames = text.canvasFrames;

  const frameActions = (
    frame: CanvasFrame,
    did: string | null
  ): FrameMenuItem[] => toFrameActions(props, frame, did);

  return {
    activeId,
    appPages,
    baseLabel,
    directionId,
    directionName,
    directions,
    frameActions,
    frames,
    kind,
    projectId,
    selection,
    setSelection,
  };
};

const toPlayComment = (props: ViewProps): PlayCommentOptions | null => {
  const { comments, playComments } = props;

  if (!comments || !playComments) {
    return null;
  }

  return {
    Layer: playComments,
    control: comments,
    toTools: (path: string) => commentToolsOf(props, path),
  };
};

const toPrototypeInput = (
  props: ViewProps,
  text: StageState,
  previewState: PreviewState,
  edits: EditsState
): PrototypeInput => {
  const { projectId, directionId, kind, selection } = props;
  const { active, baseUrl, live, shown } = text;
  const { passive } = previewState;
  const { notify } = edits.layerEdits;
  const sandbox = toSandbox(kind);
  const { frames } = text.layout;
  const on = text.protoOn;
  const preview = previewState.frames;
  const playComment = toPlayComment(props);
  const clearSelection = (): void => props.setSelection(() => []);
  const { stageRef } = text;

  const focusStage = (): void => {
    stageRef.current?.focus({ preventScroll: true });
  };

  return {
    active,
    baseUrl,
    clearSelection,
    directionId,
    focusStage,
    frames,
    kind,
    live,
    notify,
    on,
    passive,
    playComment,
    preview,
    projectId,
    sandbox,
    selection,
    shown,
  };
};

const focusFrontFrame = (frames: PreviewState["frames"]): void => {
  const { elements, frontToken } = frames;

  if (frontToken) {
    elements.current[frontToken]?.focus();
  }
};

const toAppCanvasInput = (
  props: ViewProps,
  text: StageState,
  preview: PreviewState,
  edits: EditsState
): AppCanvasInput => {
  const { app, projectId } = props;
  const { active, viewport, pz, comment, liveUrl } = text;
  const { listen } = preview.frames;
  const { freeze, zoomToActive: focus } = pz;
  const { notify } = edits.layerEdits;
  const frames = text.canvasFrames;
  const resetKey = `${active.id}|${String(liveUrl)}`;
  const size = viewport;

  const onSignIn = (): void => {
    text.setSelectMode(false);
    text.setProtoOn(false);
    comment.setOn(false);
    requestAnimationFrame(() => focusFrontFrame(preview.frames));
  };

  return {
    app,
    focus,
    frames,
    freeze,
    listen,
    notify,
    onSignIn,
    projectId,
    resetKey,
    size,
  };
};

export {
  toAppCanvasInput,
  toCommandsInput,
  toLabelInput,
  toPrototypeInput,
  toSandbox,
};

export type {
  CanvasWiring,
  CommandsInput,
  EditsState,
  LofiSwitch,
  PreviewState,
  StageState,
};
