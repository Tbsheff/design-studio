import type { InspectResult, RenderCheckOptions, TileRequest, TileResult } from './preview/browser.js';
import type { RenderPage } from './preview/render-backend.js';
import type {
  AppLogLine,
  AppServerStatus,
  Attachment,
  CheckViewport,
  Direction,
  PermissionDecision,
  Project,
  ProjectKind,
  ProjectSettings,
  QueuedMessage,
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
  projectsDir: string;
  studioPort: number;
  previewPort: number;
  vitePortBase: number;
  appPortBase?: number;
  appPortCount?: number;
  studioToken: string;
  agentMode: 'sdk' | 'mock';
  studioOrigin: string;
  previewOrigin: string;
  fetchAllowLoopback?: boolean;
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
  importFolder(sourcePath: string, options?: { appDir?: string; skipApp?: boolean }): Promise<Project>;
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
  untrackedCount?(project: Project): number | null;
  commitFile(project: Project, direction: Direction, relativePath: string | string[], title: string, meta: VersionMeta): Promise<Version | null>;
  status(project: Project, direction: Direction, paths?: string[]): Promise<WorkTreeStatus>;
  headFile?(project: Project, direction: Direction, relativePath: string): Promise<Uint8Array | null>;
  discard(project: Project, direction: Direction): Promise<WorkTreeStatus>;
  restore(project: Project, direction: Direction, versionId: string, kind: 'undo' | 'restore'): Promise<Version>;
  checkoutInto(project: Project, versionId: string, targetDir: string): Promise<void>;
  snapshot(project: Project, versionId: string): Promise<string>;
  exportZip(project: Project, versionId: string): Promise<Uint8Array>;
  sessionSince?(project: Project, direction: Direction, baseVersionId: string): Promise<SessionSpan>;
  endSession?(project: Project, direction: Direction, baseVersionId: string, action: 'save' | 'discard', title: string, meta: VersionMeta): Promise<SessionEndResult>;
}

export interface SessionSpan {
  count: number;
  dirty: boolean;
  foreign: string | null;
  titles: string[];
  outside?: number;
}

export interface SessionEndResult {
  version: Version | null;
  head: string;
  changed: string[];
  remapped?: Record<string, { id: string; parentId: string }>;
}

export interface RunHandle {
  runId: string;
  cancel(): void;
  done: Promise<RunSummary>;
  setQueue?(items: QueuedMessage[]): boolean;
  steer?(text: string): boolean;
  answer?(requestId: string, decision: PermissionDecision): boolean;
  next?(): { text: string; reason: 'queue' | 'steer' } | null;
}

export interface AgentRunContext {
  project: Project;
  direction: Direction;
  request: RunRequest;
  attachments: Attachment[];
  designMd: string | null;
  designSystem?: DesignSystemPromptContext | null;
  previewUrl: string | null;
  mentionFiles?: MentionFile[];
}

export interface MentionFile {
  path: string;
  text: string;
  truncated: boolean;
}

export interface AgentRunner {
  start(ctx: AgentRunContext): RunHandle;
  get(runId: string): RunHandle | undefined;
  isRunning(projectId: string, directionId: string): boolean;
  stopping?(projectId: string, directionId: string): Promise<unknown> | null;
}

export interface AppControl {
  status(project: Project): AppServerStatus;
  logs(projectId: string): AppLogLine[];
  ensure(project: Project): Promise<string>;
  stop(projectId: string): Promise<void>;
  restart(project: Project): Promise<string>;
  forget(projectId: string): void;
}

export interface PreviewService {
  start(): Promise<void>;
  stop(): Promise<void>;
  directionUrl(project: Project, direction: Direction): Promise<string>;
  snapshotUrl(project: Project, versionId: string, snapshotDir: string): Promise<string>;
  snapshotShot?(project: Project, versionId: string, snapshotDir: string): Promise<{ url: string; release: () => Promise<void> }>;
  watch(project: Project, direction: Direction): void;
  unwatch(directionId: string): void;
  release(project: Project, direction: Direction): Promise<void>;
  renderCheck(project: Project, direction: Direction, options?: RenderCheckOptions): Promise<RenderCheckResult[]>;
  apps?: AppControl;
  inspect(url: string, viewport: CheckViewport, outPath: string, selectionLocs: string[]): Promise<InspectResult>;
  screenshot(url: string, viewport: { width: number; height: number }, outPath: string): Promise<string>;
  screenshotTiles(url: string, request: TileRequest): Promise<TileResult>;
  withPage?<T>(url: string, viewport: { width: number; height: number; scale?: number }, task: (page: RenderPage) => Promise<T>): Promise<T>;
  elementShots?(url: string, viewport: { width: number; height: number }, selectors: string[], outPrefix: string): Promise<(string | null)[]>;
}
