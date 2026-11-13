import type { SelectionContext } from "@design-studio/contracts";

import { createLiveStore } from "../../platform/live-store.js";
import type {
  PreviewHost,
  PreviewOptions,
  PreviewSetters,
  PreviewState,
} from "./preview-frames-types.js";
import type { HoverBox } from "./preview-rect-model.js";
import type { PreviewSlot } from "./preview-slot-model.js";

const noOp = (): null => null;

const EMPTY_OPTIONS: PreviewOptions = {
  baseUrl: null,
  directionId: null,
  kind: "html",
  lastChange: null,
  live: false,
  onError: noOp,
  onFrameWheel: noOp,
  onModeExited: noOp,
  onZoomKey: noOp,
  projectId: "",
  selectMode: false,
  selection: [],
  setSelection: noOp,
};

const createPreviewState = (
  services: PreviewHost,
  updaters: PreviewSetters
): PreviewState => ({
  dragHold: false,
  elements: { current: {} },
  frameErrorAt: {},
  front: null,
  handledChange: null,
  heldRects: null,
  hmrFallback: null,
  holdTimer: null,
  holdUntil: 0,
  host: services,
  hover: createLiveStore<HoverBox | null>(null),
  lastPaintAt: {},
  listeners: new Set(),
  mountedAt: Date.now(),
  openReported: false,
  opts: EMPTY_OPTIONS,
  pendingReact: null,
  pendingSelectAt: null,
  pendingSwap: null,
  picked: createLiveStore<SelectionContext[] | null>(null),
  reselectOnSwap: false,
  setters: updaters,
  slots: [] as PreviewSlot[],
  textEditing: false,
  treeTimer: null,
  treeWanted: false,
});

const mirrorPreview = (
  state: PreviewState,
  options: PreviewOptions,
  slots: PreviewSlot[],
  front: string | null
): void => {
  state.opts = options;
  state.slots = slots;
  state.front = front;
};

export { createPreviewState, mirrorPreview };
