import {
  CONFLICT,
  NOT_FOUND,
  UNPROCESSABLE,
} from "@design-studio/actions/_core/errors/http-status-codes";
import type {
  Direction,
  DirectEditRequest,
  EditHistoryList,
  EditHistoryState,
  Project,
  TailwindOutcome,
  TextSourceInfo,
  Version,
} from "@design-studio/contracts";
import type { LayoutChange } from "@design-studio/contracts/canvas-file";

import type {
  AgentRunner,
  ProjectStore,
  VersionStore,
} from "../../shared/server-ports.js";
import type { EventBus } from "./bus.js";

type DirectEditErrorCode =
  | "invalid_request"
  | "invalid_source"
  | "source_not_found"
  | "element_not_found"
  | "parse_failed"
  | "not_host_element"
  | "style_not_literal"
  | "text_not_editable"
  | "text_from_data"
  | "cannot_move"
  | "cannot_restructure"
  | "attribute_not_literal"
  | "classes_not_editable"
  | "variant_not_supported"
  | "no_change"
  | "stale_selection"
  | "no_base_version"
  | "run_in_progress"
  | "unknown_token"
  | "invalid_token"
  | "token_exists"
  | "tokens_invalid"
  | "no_design_system"
  | "no_tweaks"
  | "unknown_tweak"
  | "invalid_tweak_value"
  | "tweak_not_declared"
  | "history_empty"
  | "history_stale";

type DirectEditStatus =
  | typeof CONFLICT
  | typeof NOT_FOUND
  | typeof UNPROCESSABLE;

const STATUS_FOR_CODE: Partial<Record<DirectEditErrorCode, DirectEditStatus>> =
  {
    history_stale: CONFLICT,
    no_design_system: NOT_FOUND,
    no_tweaks: NOT_FOUND,
    run_in_progress: CONFLICT,
    token_exists: CONFLICT,
  };

class DirectEditError extends Error {
  public readonly code: DirectEditErrorCode;
  private readonly statusOverride: DirectEditStatus | null;

  public constructor(
    code: DirectEditErrorCode,
    message: string,
    status: DirectEditStatus | null = null
  ) {
    super(message);
    this.name = "DirectEditError";
    this.code = code;
    this.statusOverride = status;
  }

  public get status(): DirectEditStatus {
    return this.statusOverride ?? STATUS_FOR_CODE[this.code] ?? UNPROCESSABLE;
  }
}

interface SourcePosition {
  line: number;
  col: number;
}

interface PatchResult {
  code: string;
  tag: string;
  applied: { style: string[]; text: boolean; classes?: boolean };
  title?: string;
  moved?: SourcePosition;
  tailwind?: TailwindOutcome;
  textSource?: TextSourceInfo;
}

interface EditFileChange {
  file: string;
  relative: string;
  before: string;
  after: string;
  created?: boolean;
}

type VariationSettledState = "kept" | "discarded" | null;

interface VariationSettle {
  readonly directionId: string;
  readonly before: VariationSettledState;
  readonly after: VariationSettledState;
}

interface EditRecord {
  projectId: string;
  directionId: string;
  label: string;
  versionId: string;
  files: EditFileChange[];
  layout?: LayoutChange;
  directionIds?: readonly string[];
  settles?: readonly VariationSettle[];
}

interface EditRecorder {
  record: (entry: EditRecord) => void;
}

interface DirectEditDeps {
  bus: EventBus;
  projects: Pick<ProjectStore, "updateDirection">;
  versions: VersionStore;
  runner: Pick<AgentRunner, "isRunning">;
  history?: EditRecorder;
  previewOrigin?: (
    project: Project,
    direction: Direction
  ) => Promise<string | null>;
}

interface ResolvedSource {
  file: string;
  relative: string;
}

interface PlannedDirectEdit {
  request: DirectEditRequest;
  target: ResolvedSource;
  original: string;
  patch: PatchResult;
}

interface EditScope {
  projectKind: Project["kind"];
  previewOrigin?: () => Promise<string | null>;
}

type HistoryStep = "undo" | "redo";

interface EditStepResult {
  state: EditHistoryState;
  version: Version;
  label: string;
}

interface EditHistory extends EditRecorder {
  mark: () => number;
  dropUnsaved: (projectId: string, since: number) => Promise<number>;
  state: (projectId: string, directionId: string) => EditHistoryState;
  list?: (
    projectId: string,
    directionId: string,
    limit: number
  ) => EditHistoryList;
  step: (
    kind: HistoryStep,
    deps: DirectEditDeps,
    project: Project,
    direction: Direction
  ) => Promise<EditStepResult>;
  clear: (projectId: string, directionId?: string) => void;
  forget: (projectId: string, directionId: string) => void;
}

export { DirectEditError };

export type {
  DirectEditDeps,
  DirectEditErrorCode,
  EditFileChange,
  EditHistory,
  EditRecord,
  EditRecorder,
  EditScope,
  EditStepResult,
  HistoryStep,
  PatchResult,
  PlannedDirectEdit,
  ResolvedSource,
  SourcePosition,
  VariationSettle,
  VariationSettledState,
};
