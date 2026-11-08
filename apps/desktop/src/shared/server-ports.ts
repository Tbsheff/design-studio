import type {
  AppLogLine,
  AppTokenSource,
  CompiledTokenEntry,
  NavSummary,
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
  Version,
  VersionChanges,
  VersionMeta,
  WorkTreeStatus,
} from "@design-studio/contracts";
import type { AppDoctorResult } from "@design-studio/contracts/app-doctor";
import type { DesignRule } from "@design-studio/contracts/design-rules";

import type {
  RenderBackendName,
  RenderClip,
  RenderErrors,
} from "./render-rpc.js";
import type { PlaceholderMode } from "./run-levels.js";
import type { RunTarget } from "./run-target.js";

interface DesignSystemPromptContext {
  designMd: string | null;
  entries: CompiledTokenEntry[];
  googleFontsUrl: string | null;
  errors: string[];
  source?: AppTokenSource;
}

interface ProbeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type AxeValue =
  | string
  | number
  | boolean
  | null
  | AxeValue[]
  | { [key: string]: AxeValue };

interface AxeNode {
  target: unknown[];
  html: string;
  failureSummary?: string;
  any?: { id: string; data?: Record<string, AxeValue> | null }[];
}

interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  helpUrl?: string;
  nodes: AxeNode[];
}

interface RenderPage {
  goto: (url: string) => Promise<void>;
  evaluate: <Result>(expression: string) => Promise<Result>;
  screenshot: (outPath: string, clip?: RenderClip) => Promise<void>;
  errors: () => Promise<RenderErrors>;
  close: () => Promise<void>;
  lastNav?: () => { loadMs: number; idleMs: number } | null;
  reset?: () => Promise<void>;
  axe?: () => Promise<AxeViolation[]>;
}

interface RenderViewport {
  width: number;
  height: number;
  scale?: number;
}

interface RenderBackend {
  readonly name: RenderBackendName;
  readonly reusablePages?: boolean;
  open: (viewport: RenderViewport) => Promise<RenderPage>;
  close: () => Promise<void>;
  warm?: () => Promise<void>;
}

interface PeekOptions {
  layoutOnly?: boolean;
}

interface RenderCheckOptions {
  viewports?: CheckViewport[];
  quality?: boolean;
  placeholder?: PlaceholderMode;
  selectionLocs?: string[];
  url?: string;
  filePrefix?: string;
  prepare?: string;
  fresh?: boolean;
  appOnly?: boolean;
}

interface InspectResult {
  path: string;
  selectionRects: ProbeRect[];
  nav: NavSummary;
}

interface TileRequest {
  viewport: { width: number; height: number };
  tileHeight: number;
  from: number;
  maxTiles: number;
  outPrefix: string;
  theme?: "light" | "dark";
  still?: boolean;
  prepare?: string;
  format?: "png" | "jpeg";
  fresh?: boolean;
  oneOff?: boolean;
}

interface TileResult {
  paths: string[];
  pageHeight: number;
  from: number;
  to: number;
  cached?: boolean;
}

interface ServerConfig {
  dataDir: string;
  projectsDir: string;
  studioPort: number;
  previewPort: number;
  vitePortBase: number;
  appPortBase?: number;
  appPortCount?: number;
  studioToken: string;
  agentMode: "sdk" | "mock";
  studioOrigin: string;
  previewOrigin: string;
  fetchAllowLoopback?: boolean;
}

interface ProjectStore {
  list: () => Promise<Project[]>;
  get: (projectId: string) => Promise<Project>;
  create: (input: {
    name: string;
    kind: ProjectKind;
    settings?: Partial<ProjectSettings>;
  }) => Promise<Project>;
  importFolder: (
    sourcePath: string,
    options?: { appDir?: string; skipApp?: boolean }
  ) => Promise<Project>;
  save: (project: Project) => Promise<void>;
  addDirection: (
    projectId: string,
    input: { name: string; fromVersionId: string | null }
  ) => Promise<Direction>;
  updateDirection: (
    projectId: string,
    directionId: string,
    patch: Partial<Direction>
  ) => Promise<Direction>;
  projectDir: (projectId: string) => string;
  saveAttachment: (
    projectId: string,
    file: { name: string; mime: string; bytes: Uint8Array }
  ) => Promise<Attachment>;
  getAttachment: (
    projectId: string,
    attachmentId: string
  ) => Promise<Attachment>;
  readDesignMd: (projectId: string) => Promise<string | null>;
  writeDesignMd: (projectId: string, content: string) => Promise<void>;
}

type CommitFileArgs = [
  project: Project,
  direction: Direction,
  relativePath: string | string[],
  title: string,
  meta: VersionMeta,
];

type EndSessionArgs = [
  project: Project,
  direction: Direction,
  baseVersionId: string,
  action: "save" | "discard",
  title: string,
  meta: VersionMeta,
];

interface VersionStore {
  ensureRepo: (project: Project) => Promise<void>;
  commit: (
    project: Project,
    direction: Direction,
    title: string,
    meta: VersionMeta
  ) => Promise<Version | null>;
  list: (project: Project, direction: Direction) => Promise<Version[]>;
  get: (project: Project, versionId: string) => Promise<Version>;
  untrackedCount?: (project: Project) => number | null;
  commitFile: (...args: CommitFileArgs) => Promise<Version | null>;
  status: (
    project: Project,
    direction: Direction,
    paths?: string[]
  ) => Promise<WorkTreeStatus>;
  headFile?: (
    project: Project,
    direction: Direction,
    relativePath: string
  ) => Promise<Uint8Array | null>;
  fileAt?: (
    project: Project,
    versionId: string,
    relativePath: string
  ) => Promise<Uint8Array | null>;
  discard: (project: Project, direction: Direction) => Promise<WorkTreeStatus>;
  restore: (
    project: Project,
    direction: Direction,
    versionId: string,
    kind: "undo" | "restore"
  ) => Promise<Version>;
  checkoutInto: (
    project: Project,
    versionId: string,
    targetDir: string
  ) => Promise<void>;
  snapshot: (project: Project, versionId: string) => Promise<string>;
  exportZip: (project: Project, versionId: string) => Promise<Uint8Array>;
  sessionSince?: (
    project: Project,
    direction: Direction,
    baseVersionId: string
  ) => Promise<SessionSpan>;
  endSession?: (...args: EndSessionArgs) => Promise<SessionEndResult>;
  diffFiles?: (
    project: Project,
    from: string,
    to: string
  ) => Promise<VersionChanges>;
}

interface SessionSpan {
  count: number;
  dirty: boolean;
  foreign: string | null;
  titles: string[];
  outside?: number;
}

interface SessionEndResult {
  version: Version | null;
  head: string;
  changed: string[];
  remapped?: Record<string, { id: string; parentId: string }>;
}

interface RunHandle {
  runId: string;
  cancel: () => void;
  done: Promise<RunSummary>;
  setQueue?: (items: QueuedMessage[]) => boolean;
  steer?: (text: string) => boolean;
  answer?: (requestId: string, decision: PermissionDecision) => boolean;
  next?: () => { text: string; reason: "queue" | "steer" } | null;
}

interface AgentRunContext {
  project: Project;
  direction: Direction;
  request: RunRequest;
  attachments: Attachment[];
  designMd: string | null;
  designSystem?: DesignSystemPromptContext | null;
  designRules?: DesignRule[];
  previewUrl: string | null;
  mentionFiles?: MentionFile[];
  target?: RunTarget | null;
  repoContext?: string | null;
}

interface MentionFile {
  path: string;
  text: string;
  truncated: boolean;
}

interface AgentRunner {
  start: (ctx: AgentRunContext) => RunHandle;
  get: (runId: string) => RunHandle | undefined;
  isRunning: (projectId: string, directionId: string) => boolean;
  stopping?: (
    projectId: string,
    directionId: string
  ) => Promise<RunSummary> | null;
}

interface AppControl {
  status: (project: Project) => AppServerStatus;
  logs: (projectId: string) => AppLogLine[];
  ensure: (project: Project) => Promise<string>;
  stop: (projectId: string) => Promise<void>;
  restart: (project: Project) => Promise<string>;
  forget: (projectId: string) => void;
  readonly stopAll?: () => Promise<void>;
  doctor?: (project: Project, fresh?: boolean) => Promise<AppDoctorResult>;
}

interface PreviewService {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  directionUrl: (project: Project, direction: Direction) => Promise<string>;
  snapshotUrl: (
    project: Project,
    versionId: string,
    snapshotDir: string,
    page?: string
  ) => Promise<string>;
  snapshotShot?: (
    project: Project,
    versionId: string,
    snapshotDir: string,
    page?: string
  ) => Promise<{ url: string; release: () => Promise<void> }>;
  watch: (project: Project, direction: Direction) => void;
  unwatch: (projectId: string, directionId: string) => void;
  release: (project: Project, direction: Direction) => Promise<void>;
  renderCheck: (
    project: Project,
    direction: Direction,
    options?: RenderCheckOptions & { url?: string }
  ) => Promise<RenderCheckResult[]>;
  apps?: AppControl;
  inspect: (
    url: string,
    viewport: CheckViewport,
    outPath: string,
    selectionLocs: string[]
  ) => Promise<InspectResult>;
  screenshot: (
    url: string,
    viewport: { width: number; height: number },
    outPath: string
  ) => Promise<string>;
  screenshotTiles: (url: string, request: TileRequest) => Promise<TileResult>;
  withPage?: <Value>(
    url: string,
    viewport: { width: number; height: number; scale?: number },
    task: (page: RenderPage) => Promise<Value>
  ) => Promise<Value>;
  peekPage?: <Value>(
    url: string,
    viewport: { width: number; height: number },
    task: (page: RenderPage) => Promise<Value>,
    options?: PeekOptions
  ) => Promise<Value>;
  elementShots?: (
    url: string,
    viewport: { width: number; height: number },
    selectors: string[],
    outPrefix: string
  ) => Promise<(string | null)[]>;
  sourceStamp?: (url: string) => Promise<string | null>;
  livePages?: (projectId: string) => Promise<string[]>;
  warmBrowser?: () => void;
  usageEdges?: (
    workTree: string,
    roots: string[]
  ) => Promise<[file: string, deps: string[]][]>;
}

interface DiffResult {
  png: Buffer;
  changedPct: number;
}

type ThumbnailDiffArguments = [
  projectId: string,
  beforeId: string,
  afterId: string,
  viewport: { width: number; height: number },
  signal?: AbortSignal,
];

interface ThumbnailService {
  schedule: (projectId: string) => void;
  file: (projectId: string, versionId: string) => Promise<Buffer>;
  version: (
    projectId: string,
    versionId: string,
    signal?: AbortSignal
  ) => Promise<Buffer>;
  diff: (...args: ThumbnailDiffArguments) => Promise<DiffResult>;
  idle: () => Promise<void>;
}

export type {
  ServerConfig,
  AgentRunContext,
  AgentRunner,
  AppControl,
  AxeNode,
  AxeViolation,
  DesignSystemPromptContext,
  DiffResult,
  InspectResult,
  MentionFile,
  PeekOptions,
  PreviewService,
  ProbeRect,
  ProjectStore,
  RenderBackend,
  RenderCheckOptions,
  RenderPage,
  RenderViewport,
  RunHandle,
  SessionEndResult,
  SessionSpan,
  ThumbnailService,
  TileRequest,
  TileResult,
  VersionStore,
};
