import type { LayoutChange } from "../../../shared/actions/_core/canvas-file.js";
import type {
  Direction,
  DirectEditRequest,
  Project,
} from "../../../shared/actions/_core/contracts.js";
import type {
  AgentRunner,
  EventBus,
  ProjectStore,
  VersionStore,
} from "../../types.js";
import type { PatchResult } from "../engine/errors.js";

export interface EditFileChange {
  file: string;
  relative: string;
  before: string;
  after: string;
  created?: boolean;
}

export interface EditRecord {
  projectId: string;
  directionId: string;
  label: string;
  versionId: string;
  files: EditFileChange[];
  layout?: LayoutChange;
}

export interface EditRecorder {
  record(entry: EditRecord): void;
}

export interface DirectEditDeps {
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

export interface ResolvedSource {
  file: string;
  relative: string;
}

export interface PlannedEdit {
  request: DirectEditRequest;
  target: ResolvedSource;
  original: string;
  patch: PatchResult;
}

export interface EditScope {
  projectKind: Project["kind"];
  previewOrigin?: () => Promise<string | null>;
}
