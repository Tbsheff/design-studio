import type { ComponentType, MutableRefObject } from "react";

import type {
  AttachedApp,
  CompiledTokenEntry,
  ComponentInfo,
  Direction,
  ProjectKind,
  SelectionContext,
  ZoomKey,
} from "../../../shared/contracts.js";
import type { PreviewPort } from "../../bridge.js";
import type { CanvasSource } from "../../components/CanvasToolbar.js";
import type { FrameVariation } from "../../components/FrameControls.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { CommentsControl } from "../../useComments.js";
import type { TextCommitHandler } from "../../useInlineTextEdit.js";
import type { BuildError, FilesChange } from "../../useStudioData.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasShell } from "./canvas-shell.js";

interface Props {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  headVersionId: string | null;
  source: CanvasSource;
  onSource: (s: CanvasSource) => void;
  lastChange: FilesChange | null;
  selection: SelectionContext[];
  setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
  onError: (e: Omit<BuildError, "id" | "ts">) => void;
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
  onInlinePrompt?: ((prompt: string) => void) | null;
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
  check: { run: () => void; checking: boolean };
  play: () => void;
}

export type { CanvasCommentTools, CanvasDirections, Props, ViewProps };
