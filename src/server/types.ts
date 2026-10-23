import type { InspectResult, RenderCheckOptions, TileRequest, TileResult } from './preview/browser.js';
import type {
  Attachment,
  CheckViewport,
  Direction,
  Project,
  ProjectKind,
  ProjectSettings,
  RenderCheckResult,
  RunRequest,
  RunSummary,
  StudioEvent,
  StudioEventInput,
  Version,
  VersionMeta,
  WorkTreeStatus,
} from '../shared/contracts.js';
import type { DesignSystemPromptContext } from './design-system/state.js';

export interface ServerConfig {
  dataDir: string;
  studioPort: number;
  previewPort: number;
  vitePortBase: number;
  studioToken: string;
  agentMode: 'sdk' | 'mock';
  studioOrigin: string;
  previewOrigin: string;
}

export interface EventBus {
  emit(event: StudioEventInput): StudioEvent;
  since(projectId: string, afterSeq: number): StudioEvent[];
  subscribe(projectId: string, listener: (event: StudioEvent) => void): () => void;
}

export interface ProjectStore {
  list(): Promise<Project[]>;
  get(projectId: string): Promise<Project>;
  create(input: { name: string; kind: ProjectKind; settings?: Partial<ProjectSettings> }): Promise<Project>;
  importFolder(sourcePath: string): Promise<Project>;
  save(project: Project): Promise<void>;
  addDirection(projectId: string, input: { name: string; fromVersionId: string | null }): Promise<Direction>;
  updateDirection(projectId: string, directionId: string, patch: Partial<Direction>): Promise<Direction>;
  projectDir(projectId: string): string;
  saveAttachment(projectId: string, file: { name: string; mime: string; bytes: Uint8Array }): Promise<Attachment>;
  getAttachment(projectId: string, attachmentId: string): Promise<Attachment>;
  readDesignMd(projectId: string): Promise<string | null>;
  writeDesignMd(projectId: string, content: string): Promise<void>;
}

export interface VersionStore {
  ensureRepo(project: Project): Promise<void>;
  commit(project: Project, direction: Direction, title: string, meta: VersionMeta): Promise<Version | null>;
  list(project: Project, direction: Direction): Promise<Version[]>;
  get(project: Project, versionId: string): Promise<Version>;
  commitFile(project: Project, direction: Direction, relativePath: string | string[], title: string, meta: VersionMeta): Promise<Version | null>;
  status(project: Project, direction: Direction, paths?: string[]): Promise<WorkTreeStatus>;
  discard(project: Project, direction: Direction): Promise<WorkTreeStatus>;
  restore(project: Project, direction: Direction, versionId: string, kind: 'undo' | 'restore'): Promise<Version>;
  checkoutInto(project: Project, versionId: string, targetDir: string): Promise<void>;
  snapshot(project: Project, versionId: string): Promise<string>;
  exportZip(project: Project, versionId: string): Promise<Uint8Array>;
}

export interface RunHandle {
  runId: string;
  cancel(): void;
  done: Promise<RunSummary>;
}

export interface AgentRunContext {
  project: Project;
  direction: Direction;
  request: RunRequest;
  attachments: Attachment[];
  designMd: string | null;
  designSystem?: DesignSystemPromptContext | null;
  previewUrl: string | null;
}

export interface AgentRunner {
  start(ctx: AgentRunContext): RunHandle;
  get(runId: string): RunHandle | undefined;
  isRunning(projectId: string, directionId: string): boolean;
}

export interface PreviewService {
  start(): Promise<void>;
  stop(): Promise<void>;
  directionUrl(project: Project, direction: Direction): Promise<string>;
  snapshotUrl(project: Project, versionId: string, snapshotDir: string): Promise<string>;
  watch(project: Project, direction: Direction): void;
  unwatch(directionId: string): void;
  renderCheck(project: Project, direction: Direction, options?: RenderCheckOptions): Promise<RenderCheckResult[]>;
  inspect(url: string, viewport: CheckViewport, outPath: string, selectionLocs: string[]): Promise<InspectResult>;
  screenshot(url: string, viewport: { width: number; height: number }, outPath: string): Promise<string>;
  screenshotTiles(url: string, request: TileRequest): Promise<TileResult>;
}
