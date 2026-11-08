import type {
  AppKey,
  BridgeToParent,
  ProjectKind,
  SelectionContext,
  ZoomKey,
} from "@design-studio/contracts";
import type { Dispatch, SetStateAction } from "react";

import type { LiveStore } from "../../platform/live-store.js";
import type { HoverBox } from "./preview-rect-model.js";
import type { PreviewSlot } from "./preview-slot-model.js";

type Timer = ReturnType<typeof globalThis.setTimeout>;

type TextEditMessage = Extract<
  BridgeToParent,
  { type: "text-edit" | "text-commit" }
>;

type RectsMessage = Extract<BridgeToParent, { type: "rects" }>;

type TreeMessage = Extract<BridgeToParent, { type: "tree" }>;

type WheelMessage = Extract<BridgeToParent, { type: "wheel" }>;

interface ChangeInfo {
  readonly directionId: string;
  readonly changedAt: number;
  readonly receivedAt: number;
  readonly shouldReload: boolean;
}

const ERROR_SOURCES = [
  "build",
  "console",
  "runtime",
  "unhandledrejection",
] as const;

type ErrorSource = (typeof ERROR_SOURCES)[number];

interface ErrorInfo {
  readonly directionId: string | null;
  readonly source: ErrorSource;
  readonly message: string;
  readonly file: string | null;
  readonly line: number | null;
}

interface PreviewOptions {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  baseUrl: string | null;
  live: boolean;
  lastChange: ChangeInfo | null;
  selectMode: boolean;
  marquee?: boolean;
  selection: SelectionContext[];
  setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
  onError: (event: ErrorInfo) => void;
  onModeExited: () => void;
  onFrameWheel: (frame: HTMLIFrameElement | null, wheel: WheelMessage) => void;
  onZoomKey: (key: ZoomKey) => void;
  textEditAllowed?: boolean;
  onTextEdit?: (message: TextEditMessage) => void;
  onContextMenu?: (point: { x: number; y: number }) => void;
}

interface PendingSwap {
  token: string;
  changedAt: number;
  timer: Timer;
  loaded: boolean;
  due: boolean;
}

interface PendingReact {
  changedAt: number;
  receivedAt: number;
}

interface PreviewHost {
  readonly canEditText: (target: SelectionContext) => boolean;
  readonly escapeEvent: string;
  readonly forwardAppKey: (id: AppKey) => void;
  readonly onTree: (message: TreeMessage) => void;
  readonly paintedEvent: string;
}

interface PreviewSetters {
  readonly front: (token: string | null) => void;
  readonly selectedNode: (node: number | null) => void;
  readonly slots: Dispatch<SetStateAction<PreviewSlot[]>>;
}

interface PreviewState {
  readonly elements: { current: Record<string, HTMLIFrameElement | null> };
  readonly frameErrorAt: Record<string, number>;
  readonly host: PreviewHost;
  readonly hover: LiveStore<HoverBox | null>;
  readonly lastPaintAt: Record<string, number>;
  readonly listeners: Set<(message: BridgeToParent) => void>;
  readonly mountedAt: number;
  readonly picked: LiveStore<SelectionContext[] | null>;
  readonly setters: PreviewSetters;
  dragHold: boolean;
  front: string | null;
  handledChange: ChangeInfo | null;
  heldRects: RectsMessage | null;
  hmrFallback: Timer | null;
  openReported: boolean;
  opts: PreviewOptions;
  pendingReact: PendingReact | null;
  pendingSelectAt: number | null;
  pendingSwap: PendingSwap | null;
  reselectOnSwap: boolean;
  slots: PreviewSlot[];
  textEditing: boolean;
  treeTimer: Timer | null;
  treeWanted: boolean;
}

export type {
  ChangeInfo,
  ErrorInfo,
  PendingSwap,
  PreviewHost,
  PreviewOptions,
  PreviewSetters,
  PreviewState,
  RectsMessage,
  TextEditMessage,
  Timer,
  TreeMessage,
  WheelMessage,
};
