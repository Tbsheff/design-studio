import type {
  AttachedApp,
  CompiledTokenEntry,
  ComponentInfo,
  Direction,
  ProjectKind,
  SelectionContext,
  ZoomKey,
} from "@design-studio/contracts";
import type {
  ComponentType,
  LazyExoticComponent,
  MutableRefObject,
} from "react";

import type { CanvasSource } from "../../domain/canvas-presets.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { TabOrderSlot } from "../accessibility/index.js";
import type { CommentsControl } from "../comments/use-comments.js";
import type { GridOverlay } from "../grid/index.js";
import type { BuildError, FilesChange } from "../home/use-studio-data.js";
import type { SpacingHandles } from "../spacing/index.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasShell } from "./canvas-shell.js";
import type { TextCommitHandler } from "./use-inline-text-edit.js";
import type { FrameVariation } from "./variation-controls.js";

interface Props {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  headVersionId: string | null;
  source: CanvasSource;
  onSource: (canvasSource: CanvasSource) => void;
  lastChange: FilesChange | null;
  selection: SelectionContext[];
  setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
  onError: (event: Omit<BuildError, "id" | "ts">) => void;
  port?: MutableRefObject<PreviewPort | null>;
  comments?: CommentsControl;
  commentTools?: CanvasCommentTools;
  running?: boolean;
  runStep?: string | null;
  noRuns?: boolean;
  onTextCommit?: TextCommitHandler;
  darkPreview?: boolean;
  onMakeStates?: (frame: CanvasFrame) => void;
  directions?: CanvasDirections;
  shell?: CanvasShell;
  app?: AttachedApp | null;
  onFrameChange?: () => void;
  commandsHost?: ComponentType<CanvasCommandsInput> | null;
}

interface CanvasCommentTools {
  tokens?: readonly CompiledTokenEntry[];
  components?: readonly ComponentInfo[] | null;
  onSteer?: (text: string) => void;
}

interface CanvasDirections {
  list: Direction[];
  onActivate: (directionId: string) => void;
  variationOf: (directionId: string) => FrameVariation | undefined;
}

interface ViewProps extends Omit<Props, "runStep"> {
  steps: LiveStore<string | null>;
}

interface CanvasCommandsInput {
  live: boolean;
  hasHead: boolean;
  zoomBy: (key: ZoomKey, from: "menu") => void;
  selectMode: boolean;
  setSelectMode: (update: (on: boolean) => boolean) => void;
  comment: {
    available: boolean;
    on: boolean;
    toggle: () => void;
    setOn: (on: boolean) => void;
  };
  draw: { available: boolean; on: boolean; toggle: () => void };
  layersOpen: boolean;
  onLayers: () => void;
  onSource: (source: CanvasSource) => void;
  dark: { dark: boolean; onToggle: () => void } | undefined;
  lofi?: { on: boolean; onToggle: () => void } | undefined;
  outline: { on: boolean; onToggle: () => void };
  check: { run: () => void; checking: boolean };
  play: () => void;
  addSection: () => void;
}

interface StageSlots {
  readonly Grid: LazyExoticComponent<typeof GridOverlay>;
  readonly Spacing: LazyExoticComponent<typeof SpacingHandles>;
  readonly TabOrder: LazyExoticComponent<typeof TabOrderSlot>;
}

export type {
  CanvasCommandsInput,
  CanvasCommentTools,
  CanvasDirections,
  Props,
  StageSlots,
  ViewProps,
};
