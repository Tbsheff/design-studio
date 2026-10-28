import type { CanvasFile } from './canvas-file';
import type { LinkQuery, LinkRectReport, LinksFile } from './links';
import type { StatesRequest } from './states';
import type { ElementScope } from './element-variants';
import type { StyleQuery, StyleScanResult } from './style-search';
export type ProjectKind = 'html' | 'react';

export interface ProjectSettings {
  model: string;
  maxBudgetUsd: number | null;
  maxTurns: number;
  allowBash: boolean;
  allowInstall: boolean;
  autoApprove: boolean;
  disabledSkills: string[];
  defaultLevel: RunLevel;
}

export type RunLevel = 'wireframe' | 'prototype' | 'polish';

export const RUN_LEVELS: readonly RunLevel[] = ['wireframe', 'prototype', 'polish'];

export function isRunLevel(value: unknown): value is RunLevel {
  return typeof value === 'string' && (RUN_LEVELS as readonly string[]).includes(value);
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  origin: 'personal' | `plugin:${string}`;
  sourcePath: string;
  needsBash: boolean;
  modelInvocable: boolean;
}

export interface SkillProblem {
  source: string;
  reason: string;
}

export interface SkillCatalog {
  skills: SkillInfo[];
  problems: SkillProblem[];
}

export interface Direction {
  id: string;
  name: string;
  workTree: string;
  branch: string;
  headVersionId: string | null;
  parentVersionId: string | null;
  sessionId: string | null;
  sessionCostUsd?: number;
  sessionResetReason?: SessionResetReason | null;
  createdAt: number;
  variation?: DirectionVariation | null;
}

export const VARIATION_MIN = 2;
export const VARIATION_MAX = 4;
export const VARIATION_MAX_REACT = 3;
export const VARIATION_DEFAULT = 3;
export const VARIATION_BRIEF_MAX = 280;

export interface VariationBrief {
  label: string;
  title: string;
  brief: string;
}

export interface DirectionVariation extends VariationBrief {
  groupId: string;
  index: number;
  count: number;
  prompt: string;
  scope?: ElementScope | null;
  rejected?: string | null;
  settled?: 'kept' | 'discarded' | null;
}

export interface ReferenceElement {
  fromDirectionId: string;
  fromLabel: string;
  selector: string;
  tag: string;
  outerHTML: string;
  styles: Record<string, string>;
  source: SourceLoc | null;
  snippet: string | null;
}

export interface VariationBriefsRequest {
  prompt: string;
  count: number;
  fromDirectionId?: string | null;
  element?: SelectionContext | null;
}

export interface VariationBriefsResult {
  briefs: VariationBrief[];
  source: 'model' | 'mock' | 'fallback';
  model: string | null;
  costUsd: number;
  error: string | null;
}

export interface VariationStartRequest {
  prompt: string;
  briefs: VariationBrief[];
  level?: RunLevel;
  fromDirectionId?: string | null;
  attachmentIds?: string[];
  element?: SelectionContext | null;
}

export interface VariationStartItem {
  label: string;
  directionId: string | null;
  runId: string | null;
  error: string | null;
}

export interface VariationStartResult {
  groupId: string;
  items: VariationStartItem[];
  perRunBudgetUsd: number | null;
  totalBudgetUsd: number | null;
}

export interface VariationMixRequest {
  fromDirectionId: string;
  toDirectionId: string;
  element: SelectionContext;
  prompt?: string;
  level?: RunLevel;
}

export type SessionResetReason = 'restore' | 'undo' | 'move';

export interface Project {
  id: string;
  name: string;
  kind: ProjectKind;
  createdAt: number;
  updatedAt: number;
  imported: { sourcePath: string; created?: boolean } | null;
  packId?: string | null;
  designSystemFor?: string | null;
  designSystemDeleted?: boolean;
  entry: string;
  settings: ProjectSettings;
  settingsVersion?: number;
  directions: Direction[];
  thumbnail?: ProjectThumbnail | null;
  app?: AttachedApp | null;
}

export type AppFramework = 'next' | 'vite';

export interface AttachedApp {
  framework: AppFramework;
  appDir: string;
  mode: 'managed' | 'url';
  url?: string;
  env?: Record<string, string>;
}

export type AppServerState = 'idle' | 'starting' | 'ready' | 'failed' | 'stopped';

export interface FirstVersionState {
  pending: boolean;
  startedAt: number | null;
  elapsedMs: number;
  etaSeconds: number;
  files: number | null;
  error: string | null;
}

export interface LegacyCanvasNotice {
  file: string;
  movedTo: string | null;
  frames: number;
}

export interface AppServerStatus {
  state: AppServerState;
  mode: 'managed' | 'url';
  upstream: string | null;
  command: string | null;
  message: string | null;
  startedAt: number | null;
  doctor?: import('./app-doctor.js').AppDoctorResult | null;
}

export interface AppLogLine {
  at: number;
  stream: 'stdout' | 'stderr' | 'studio';
  text: string;
}

export interface AppRoute {
  route: string;
  file: string;
  dynamic: boolean;
  group: string | null;
}

export interface AppCandidate {
  appDir: string;
  name: string;
  framework: AppFramework;
}

export interface AttachAppRequest {
  folder?: string;
  url?: string;
  appDir?: string;
  name?: string;
  env?: Record<string, string>;
}

export interface ProjectThumbnail {
  versionId: string;
  at: number;
}

export interface Starter {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export interface ClarifyQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface ReferencePage {
  url: string;
  title: string;
  text: string;
  error?: string;
}

export interface TrashedProject {
  trashId: string;
  projectId: string;
  name: string;
}

export interface TrashItem extends TrashedProject {
  trashedAt: number;
  thumbnail: boolean;
  folderStays: boolean;
}

export type VersionKind = 'init' | 'run' | 'undo' | 'restore' | 'keep' | 'fork' | 'manual';

export interface VersionMeta {
  kind: VersionKind;
  runId?: string;
  prompt?: string;
  restoredFrom?: string;
  directionId?: string;
  level?: RunLevel;
  origin?: 'mcp';
  client?: string;
}

export interface Version {
  id: string;
  directionId: string;
  parentId: string | null;
  title: string;
  meta: VersionMeta;
  createdAt: number;
  changedFiles: string[];
  name?: string;
}

export interface WorkTreeStatus {
  dirty: boolean;
  changed: string[];
}

export interface SourceLoc {
  file: string;
  line: number;
  col: number;
}

export interface SelectionContext {
  selector: string;
  tag: string;
  text: string;
  outerHTML: string;
  styles: Record<string, string>;
  rect: { x: number; y: number; width: number; height: number };
  source: SourceLoc | null;
  usedAt?: SourceLoc | null;
  usedBy?: ComponentUse | null;
  component?: string;
  owners?: { name: string; stack: string }[];
  ancestors: string[];
  path?: string[];
}

export interface ComponentUse {
  name: string;
  root: boolean;
}

export interface TextFromData {
  expression: string;
  file: string;
  line: number;
}

export interface TextSourceHints {
  text: string;
  usedAt?: SourceLoc | null;
  owners?: { name: string; stack: string }[];
}

export interface TextSourceInfo {
  file: string;
  line: number;
  what: string;
  shared?: string;
}

export type TextSourceAnswer = { found: TextSourceInfo } | { reason: string };

export interface ElementSourceInfo {
  component: string | null;
  forwardsClassName: boolean;
  textFromData: TextFromData | null;
}

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  path: string;
}

export type RunMode = 'edit' | 'critique';
export type RunTask = 'tweaks' | 'design-system';

export type RunEffort = 'low' | 'medium' | 'high';
export const RUN_EFFORTS: readonly RunEffort[] = ['low', 'medium', 'high'];

export type RunMention =
  | { kind: 'file'; path: string }
  | { kind: 'token'; name: string; value: string }
  | { kind: 'component'; name: string; file: string | null; selector: string | null };

export interface ComponentInfo {
  id: string;
  name: string;
  source: 'react' | 'html';
  file: string | null;
  line: number | null;
  uses: number;
  selector: string | null;
}

export interface RunCanvasRef {
  frameId: string;
  label?: string;
  path: string;
  width: number;
  height: number;
  inView?: string[];
}

export interface RunRequest {
  prompt: string;
  mode: RunMode;
  level?: RunLevel;
  effort?: RunEffort;
  retryOf?: string;
  plan?: boolean;
  mentions?: RunMention[];
  variation?: VariationBrief & { index: number; count: number };
  scope?: ElementScope;
  reference?: ReferenceElement;
  selection?: SelectionContext[];
  attachmentIds?: string[];
  comments?: RunComment[];
  commentIds?: string[];
  task?: RunTask;
  referencePages?: ReferencePage[];
  states?: StatesRequest;
  canvas?: RunCanvasRef;
}

export type CommentStatus = 'draft' | 'queued' | 'sent' | 'resolved' | 'orphaned';

export interface CommentTarget {
  selector: string;
  sourceLoc?: SourceLoc | null;
  tag: string;
  textSnippet: string;
  rectHint: SelectionContext['rect'];
}

export interface DesignComment {
  id: string;
  n: number;
  createdAt: number;
  updatedAt: number;
  text: string;
  target: CommentTarget;
  context?: SelectionContext;
  status: CommentStatus;
  runId?: string;
  versionId?: string | null;
  replies?: CommentReply[];
  attachmentIds?: string[];
  mentions?: RunMention[];
  drawing?: CommentDrawing;
  author?: string;
  frame?: CommentFrame;
  from?: 'viewer';
}

export interface CommentFrame {
  id?: string;
  label?: string;
  path: string;
}

export interface CommentPrefill {
  text: string;
  commentIds: string[];
  attachments: { id: string; name: string; dataUrl: string }[];
}

export interface CommentReply {
  id: string;
  text: string;
  createdAt: number;
  author?: string;
}

export interface DrawStroke {
  color: string;
  width: number;
  points: number[];
}

export interface CommentDrawing {
  frame: { width: number; height: number };
  box: SelectionContext['rect'];
  strokes: DrawStroke[];
}

export interface RunComment {
  id: string;
  n: number;
  text: string;
  element: SelectionContext | null;
  drawing?: { frame: CommentDrawing['frame']; box: CommentDrawing['box']; image: number };
}

export interface AnchorQuery {
  id: string;
  selector: string;
  sourceLoc: string | null;
  tag: string;
  textSnippet: string;
}

export type AnchorMatch = 'source' | 'selector' | 'text';

export interface AnchorReport {
  id: string;
  rect: SelectionContext['rect'] | null;
  via: AnchorMatch | null;
  selector?: string;
  sourceLoc?: string | null;
}

export interface LoopStep {
  loop: number;
  high: number;
  medium: number;
  low: number;
}

export interface LoopSummary {
  loops: number;
  continuations: number;
  stopReason: 'clean' | 'loops' | 'budget' | 'continuations' | 'not-completed';
  steps: LoopStep[];
}

export interface AppReviewRecord {
  mobileShot: 'agent' | 'studio' | 'failed';
  review: 'agent' | 'studio';
  findings: number;
  fixLoop: boolean;
}

export interface FinalCheck {
  ranBy: 'agent' | 'studio';
  errors: number;
  high: number;
  medium: number;
  low: number;
  appReview?: AppReviewRecord;
}

export type RunStatus = 'running' | 'completed' | 'canceled' | 'failed' | 'budget_exceeded';

export interface RunUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface DiffLine {
  kind: 'same' | 'add' | 'del';
  text: string;
}

export interface DiffHunk {
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
}

export interface ToolDiff {
  path: string;
  added: number;
  removed: number;
  hunks: DiffHunk[];
  created: boolean;
  truncated: boolean;
}

export interface ToolCallRecord {
  toolUseId: string;
  name: string;
  input: unknown;
  startedAt: number;
  finishedAt: number | null;
  isError: boolean;
  summary?: string;
  diff?: ToolDiff;
  diffs?: ToolDiff[];
  denied?: boolean;
}

export type RunPart =
  | { kind: 'text'; text: string; open?: boolean }
  | { kind: 'thinking'; text: string; open?: boolean }
  | { kind: 'tool'; toolUseId: string }
  | { kind: 'user'; id: string; text: string };

export interface QueuedMessage {
  id: string;
  text: string;
}

export interface PermissionRequest {
  id: string;
  toolUseId: string | null;
  toolName: string;
  input: unknown;
  title: string;
  detail: string;
}

export type PermissionDecision = { allow: true; always?: string } | { allow: false; note?: string };

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface TodoItem {
  content: string;
  activeForm?: string;
  status: TodoStatus;
  by?: 'studio' | 'run';
  note?: string;
  skipped?: boolean;
}

export interface RunSummary {
  id: string;
  projectId: string;
  directionId: string;
  request: RunRequest;
  level: RunLevel;
  status: RunStatus;
  startedAt: number;
  finishedAt: number | null;
  model: string;
  criticCostUsd?: number;
  finalCheck?: FinalCheck;
  loop?: LoopSummary;
  designSystemCheck?: DesignSystemRunCheck;
  sessionNote?: string;
  sessionId: string | null;
  usage: RunUsage;
  costUsd: number;
  durationMs: number;
  modelMs: number;
  toolMs: number;
  toolCalls: ToolCallRecord[];
  versionId: string | null;
  error: string | null;
  finalText: string;
  parts?: RunPart[];
  todos?: TodoItem[];
  contextTokens?: number;
  title?: string;
}

interface EventBase {
  seq: number;
  ts: number;
  projectId: string;
  directionId?: string;
}

export type StudioEventBody =
  | { type: 'run.started'; runId: string; request: RunRequest }
  | { type: 'run.text.delta'; runId: string; text: string }
  | { type: 'run.text'; runId: string; text: string }
  | { type: 'run.thinking.delta'; runId: string; text: string }
  | { type: 'run.thinking'; runId: string; text: string }
  | { type: 'run.tool.started'; runId: string; toolUseId: string; name: string; input: unknown }
  | { type: 'run.tool.finished'; runId: string; toolUseId: string; isError: boolean; summary: string; durationMs: number; diff?: ToolDiff; diffs?: ToolDiff[]; denied?: boolean }
  | { type: 'run.user'; runId: string; id: string; text: string }
  | { type: 'run.queue'; runId: string; items: QueuedMessage[] }
  | { type: 'run.stopping'; runId: string }
  | { type: 'run.permission'; runId: string; request: PermissionRequest }
  | { type: 'run.permission.resolved'; runId: string; requestId: string; allow: boolean }
  | { type: 'run.todos'; runId: string; todos: TodoItem[] }
  | { type: 'run.usage'; runId: string; contextTokens: number }
  | { type: 'run.retry'; runId: string; attempt: number; max: number; delayMs: number; error: string }
  | { type: 'run.finished'; runId: string; summary: RunSummary }
  | { type: 'files.changed'; paths: string[]; changedAt: number; reload?: boolean }
  | { type: 'version.created'; version: Version }
  | { type: 'direction.updated'; direction: Direction }
  | { type: 'status.changed'; status: WorkTreeStatus }
  | { type: 'preview.build-error'; message: string; file?: string; line?: number; frame?: string }
  | { type: 'comments.changed'; comments: DesignComment[] }
  | { type: 'edit-history.changed' }
  | { type: 'versions.changed' }
  | { type: 'canvas.changed'; canvas: CanvasFile | null; hash: string | null; source: CanvasWriteSource; writer?: string }
  | { type: 'canvas.point'; frameId: string; selector?: string; at: number }
  | { type: 'links.changed'; links: LinksFile; source: CanvasWriteSource }
  | { type: 'mcp.approval'; approval: McpApprovalRecord }
  | { type: 'mcp.approval.resolved'; approvalId: string; outcome: McpApprovalOutcome }
  | { type: 'mcp.activity'; activity: McpActivity }
  | { type: 'mcp.point'; point: McpPoint }
  | { type: 'design-system.sources'; sources: DraftSourcesState }
  | { type: 'app.status'; status: AppServerStatus }
  | { type: 'frame-states.changed'; states: import('./frame-state.js').FrameStatesView }
  | { type: 'edit.planned'; id: string; patches: DomPatch[] }
  | { type: 'edit.unplanned'; id: string };

export interface McpActivity {
  id: string;
  projectId: string;
  directionId: string | null;
  tool: string;
  client: string;
  summary: string;
  versionId: string | null;
  beforeVersionId: string | null;
  frameId: string | null;
  at: number;
}

export interface McpPoint {
  client: string;
  frameId: string;
  label: string | null;
  selector?: string;
  at: number;
}

export type McpApprovalOutcome = 'allow' | 'deny' | 'timeout' | 'closed';

export interface McpApprovalRecord {
  id: string;
  tool: string;
  action: string;
  title: string;
  detail: string;
  projectId: string | null;
  client: string;
  createdAt: number;
  expiresAt: number;
}

export type CanvasWriteSource = 'user' | 'agent' | 'run' | 'restore' | 'migrate';

export interface CanvasPresence {
  directionId: string | null;
  activeFrameId: string | null;
  liveSize?: { width: number; height: number };
  inView: string[];
  selection: { selector: string; tag: string; text: string }[];
  at: number;
}

export type StudioEvent = EventBase & StudioEventBody;

export interface RunSentRecord {
  type: 'run.sent';
  runId: string;
  projectId: string;
  directionId: string;
  ts: number;
  text: string;
  imageCount: number;
  updatedInstructions: boolean;
  recommendedSkills: string[];
  promptHash: string;
  resume: string | null;
  continuation?: number;
}

export type StudioEventInput = StudioEventBody & { projectId: string; directionId?: string };

export type TelemetryKind = 'preview.latency' | 'select.latency' | 'studio.open' | 'file.write' | 'app.start' | 'run.first_token' | 'edit.commit' | 'frame.long';

export interface TelemetrySample {
  kind: TelemetryKind;
  projectId?: string;
  directionId?: string;
  ms: number;
  ts: number;
  detail?: Record<string, unknown>;
}

export interface LayoutFinding {
  kind: 'clipped' | 'scrolls-sideways' | 'past-viewport';
  severity: 'error' | 'warning';
  axis: 'x' | 'y';
  selector: string;
  source: string | null;
  text: string;
  scrollSize: number;
  clientSize: number;
  cutItems: string[];
  detail: string;
}

export type CheckViewport = 'desktop' | 'tablet' | 'mobile';

export type QualityCheckName = 'a11y' | 'tap-target' | 'placeholder' | 'tokens' | 'nav-mobile' | 'visual-diff' | 'generic-layout' | 'duplicate-content' | 'outside-layout';

export type QualitySeverity = 'high' | 'medium' | 'low';

export interface QualityFinding {
  check: QualityCheckName;
  severity: QualitySeverity;
  viewport: CheckViewport | null;
  selector: string | null;
  source: string | null;
  message: string;
  fix?: string;
  screen?: string;
}

export interface NavSummary {
  navs: number;
  totalLinks: number;
  visibleLinks: number;
  menuControl: boolean;
}

export interface RenderCheckResult {
  viewport: CheckViewport;
  width: number;
  height: number;
  ok: boolean;
  consoleErrors: string[];
  pageErrors: string[];
  horizontalOverflow: boolean;
  layout: LayoutFinding[];
  layoutTotal: number;
  screenshotPath: string;
  quality?: QualityFinding[];
  nav?: NavSummary;
  selectionRects?: { x: number; y: number; width: number; height: number }[];
  timingsMs?: Record<string, number>;
  backend?: 'playwright' | 'electron';
  screen?: string;
  cached?: boolean;
}

export const API_ROUTES = {
  getSession: 'GET /api/session (same-origin only) -> {token, previewOrigin}',
  listProjects: 'GET /api/projects -> Project[]',
  createProject: 'POST /api/projects {name?, prompt, kind, designMd?, packId?, settings?: Partial<ProjectSettings>, level?, startRun?: boolean} -> {project, runId} (startRun false: no first run, runId null; with no parentPath the project gets a new subfolder in the default projects folder)',
  listPacks: 'GET /api/packs -> PackSummary[] (built-in packs first, then user packs; user packs are read again when their files change)',
  packProblems: 'GET /api/packs/problems -> PackProblem[] (packs skipped because a file is missing or invalid)',
  getPack: 'GET /api/packs/:id -> PackDetail (404 unknown)',
  createPack: 'POST /api/packs CreateUserPackInput -> PackSummary (new user pack user-<slug of name>[-2, -3…]; 400 invalid)',
  updatePack: 'PATCH /api/packs/:id UpdateUserPackInput -> PackSummary (same id; 400 built-in or invalid, 404 unknown)',
  duplicatePack: 'POST /api/packs/:id/duplicate {name?} -> PackSummary (built-in or user; default name "<name> copy")',
  deletePack: 'DELETE /api/packs/:id -> {ok} (user packs only; 400 built-in, 404 unknown; projects that use it keep their files)',
  exportPack: 'GET /api/packs/:id/export -> application/zip (<id>/pack.json, <id>/tokens.json, <id>/DESIGN.md)',
  importPack: 'POST /api/packs/import (multipart: file = zip in the export format, mode = ask | replace | copy) -> ImportPackResult (new user pack, provenance imported; 409 pack_exists {existing} when mode is ask and a user pack has the same id or name; 400 bad zip, extra entries, path outside the folder, larger than 2 MB, invalid files)',
  checkPack: 'GET /api/packs/:id/check -> DesignSystemCheckResult (tokens, contrast, DESIGN.md and pack fonts; no kit page rules)',
  openPackEditor: 'POST /api/packs/:id/editor -> OpenPackEditorResult (the backing project whose designSystemFor is the pack id, else a new one with a kit page; 400 built-in)',
  applyPack: 'POST /api/projects/:pid/d/:did/design-system/apply {packId} -> ApplyPackResult (one version "Apply <name> design system" or "Switch to <name> design system"; keeps ## Project notes; 409 run active, 400 unknown pack)',
  savePack: 'POST /api/projects/:pid/d/:did/design-system/save {name, packId?, asNew?} -> SavePackResult (asNew creates a new user pack; else updates packId, else the user pack named in pack.json, else creates one; then pack.json names the saved pack, one version "Save <name> to library" when it changed; 400 built-in packId or invalid files, 404 no design system, 409 run active, 409 check_failed in a design-system project while the check fails unless force: true)',
  getDesignSystem: 'GET /api/projects/:pid/d/:did/design-system -> DesignSystemState',
  previewTokens: 'POST /api/projects/:pid/d/:did/design-system/preview {changes: TokenChange[]} -> TokenPreviewResult (no files written)',
  updateTokens: 'POST /api/projects/:pid/d/:did/design-system/tokens/update {changes: TokenChange[]} -> UpdateTokensResult (one version; 409 run active, 422 invalid, 404 unknown path)',
  createToken: 'POST /api/projects/:pid/d/:did/design-system/tokens CreateTokenRequest -> CreateTokenResult (409 run active, 409 token_exists, 422 invalid, 404 no design system)',
  importProject: 'POST /api/projects/import {path, appDir?, skipApp?} -> {project} (a Next.js app or a workspace with Next.js apps under apps/* attaches as an app project; 409 pick_app {candidates} when more than one app matches; skipApp imports the folder without the app, for example only its tokens)',
  attachApp: 'POST /api/projects/attach AttachAppRequest -> {project, firstVersion, legacyCanvas} (folder: managed dev server, or url: a dev server the user runs; the project points at the folder, nothing is copied; a new attach saves the first version in the background and moves an old .studio/canvas.json aside)',
  appStatus: 'GET /api/projects/:pid/app -> {app, status, logs, firstVersion} (404 when the project is not an attached app; firstVersion is null once the first version is saved)',
  appControl: 'POST /api/projects/:pid/app/start | stop | restart -> AppServerStatus',
  appConfig: 'POST /api/projects/:pid/app/config {url?, env?} -> {app} (empty url = the studio starts next dev; then the dev server restarts)',
  appRoutes: 'GET /api/projects/:pid/app/routes -> {routes: AppRoute[]} (app router page files under the app dir)',
  routeLinks: 'GET /api/projects/:pid/flow/links?route= -> RouteLinksResult (links found in the route source: <Link href>, router.push, redirect and form actions)',
  flowParams: 'GET /api/projects/:pid/flow/params -> {params} (sample values for dynamic segments, kept in the studio data dir)',
  buildFlow: 'POST /api/projects/:pid/flow {routes?|from?, depth?, params?} -> FlowResult (route frames laid out left to right, prototype links from the source links)',
  openSource: 'POST /api/projects/:pid/d/:did/open-source {source: "file:line:col"} -> {opened, path} (opens the file in the editor from STUDIO_EDITOR, default code; 422 when no editor runs)',
  createDesignSystemDraft: 'POST /api/design-systems/draft (JSON DraftRequest, or multipart: request = JSON text, tokensFile = file, images = files) -> DesignSystemDraftResult within about 1 s (draft user pack from the base pack + backing HTML project "<name> design system" with a skeleton kit page; one version). Then each source is read in the background: design-system.sources events, the kit page and tokens are rewritten after each source, one version "Read sources" at the end, then one Improve with AI run starts by itself (not with ?improve=off, which MCP sends: improve is skipped). 400 no source, blocked URL, unknown base pack',
  getDesignSystemDraft: 'GET /api/projects/:pid/design-system-draft -> DesignSystemDraftInfo with sources (DraftSourcesState or null) (404 when the project is not a design-system project)',
  createInFolder: 'POST /api/projects {..., parentPath} -> {project, runId} (makes a new subfolder <slug of name>[-2, -3…] in parentPath, registers it like an imported folder, adds parentPath to the saved folders)',
  listWorkspaces: 'GET /api/workspaces -> WorkspaceList {homeDir, folders}',
  addWorkspace: 'POST /api/workspaces {path, label?} -> WorkspaceFolder (realpath, must be a folder; same path returns the saved entry)',
  updateWorkspace: 'PATCH /api/workspaces/:id {label} -> WorkspaceFolder',
  removeWorkspace: 'DELETE /api/workspaces/:id -> {ok} (forgets the folder; never touches disk; 400 for the default folder)',
  setDefaultFolder: 'PUT /api/workspaces/default {path} -> WorkspaceList (realpath, must be a folder outside the data dir; the old default is kept as a saved folder)',
  hiddenProjects: 'GET /api/hidden-projects -> {count, target} (projects whose main work tree is in the data dir)',
  moveHiddenProjects: 'POST /api/hidden-projects/move -> {moved: pid[], failed: {projectId, error}[]} (copies each main work tree into a new subfolder of the default folder, then removes the old one)',
  pickFolder: 'POST /api/pick-folder {title?, defaultPath?} -> {path} | 204 canceled | 409 a picker is open | 501 not macOS | 504 timed out',
  getProject: 'GET /api/projects/:pid -> Project',
  updateSettings: 'PATCH /api/projects/:pid/settings Partial<ProjectSettings> (model 1..200 chars, maxBudgetUsd 0.01..50 or null for no limit, maxTurns 1..200 int, allowBash, allowInstall, disabledSkills: skill ids from GET /api/skills) -> Project',
  listSkills: 'GET /api/skills -> SkillCatalog (rescans ~/.claude/skills and enabled plugins on each call)',
  projectEvents: 'GET /api/projects/:pid/events (SSE; Last-Event-ID or ?after=seq)',
  uploadAttachment: 'POST /api/projects/:pid/attachments (multipart file; png, jpeg, gif or webp only, else 400) -> Attachment',
  getDesignMd: 'GET /api/projects/:pid/design-md -> {content}',
  putDesignMd: 'PUT /api/projects/:pid/design-md {content} -> {ok, versionId} (commits a manual version "Update DESIGN.md" on main)',
  projectFile: 'GET /api/projects/:pid/files?path= -> image/png (png under checks/ or runs/ only)',
  listRuns: 'GET /api/projects/:pid/runs -> RunSummary[]',
  createDirection: 'POST /api/projects/:pid/directions {fromVersionId, name} -> Direction',
  listVersions: 'GET /api/projects/:pid/d/:did/versions -> Version[]',
  workTreeStatus: 'GET /api/projects/:pid/d/:did/status -> WorkTreeStatus',
  startRun: 'POST /api/projects/:pid/d/:did/runs RunRequest -> {runId}',
  undo: 'POST /api/projects/:pid/d/:did/undo -> Version',
  restore: 'POST /api/projects/:pid/d/:did/restore {versionId} -> Version',
  keepUnfinished: 'POST /api/projects/:pid/d/:did/keep -> Version',
  discardUnfinished: 'POST /api/projects/:pid/d/:did/discard -> WorkTreeStatus',
  directionPreview: 'GET /api/projects/:pid/d/:did/preview -> {url}',
  renderCheck: 'POST /api/projects/:pid/d/:did/check -> RenderCheckResult[]',
  variationBriefs: 'POST /api/projects/:pid/variations/briefs VariationBriefsRequest -> VariationBriefsResult (count 2..4, react 2..3)',
  startVariations: 'POST /api/projects/:pid/variations VariationStartRequest -> VariationStartResult (N new directions + N parallel runs)',
  cancelVariations: 'POST /api/projects/:pid/variations/:gid/cancel -> {canceled: runId[]}',
  mixVariation: 'POST /api/projects/:pid/variations/mix VariationMixRequest -> {runId} (edit run on the target with the element as a <reference-element>)',
  listComments: 'GET /api/projects/:pid/d/:did/comments -> DesignComment[]',
  createComment: 'POST /api/projects/:pid/d/:did/comments {text, target, context?, status?: draft|queued, attachmentIds?, mentions?, drawing?} -> DesignComment',
  profile: 'GET /api/profile -> {name: string | null}',
  updateComment: 'PATCH /api/projects/:pid/d/:did/comments/:cid {text?, status?, target?, context?} -> DesignComment (409 bad_transition)',
  deleteComment: 'DELETE /api/projects/:pid/d/:did/comments/:cid -> {ok}',
  addCommentReply: 'POST /api/projects/:pid/d/:did/comments/:cid/replies {text} -> DesignComment',
  deleteCommentReply: 'DELETE /api/projects/:pid/d/:did/comments/:cid/replies/:rid -> DesignComment',
  reorderComments: 'POST /api/projects/:pid/d/:did/comments/reorder {ids} -> DesignComment[]',
  sendComments: 'POST /api/projects/:pid/d/:did/comments/send {ids?, contexts?, level?} -> {runId, comments} (409 run_in_progress: comments stay queued)',
  directEdit: 'POST /api/projects/:pid/d/:did/direct-edit DirectEditRequest {style?, text?, classes? {add?, remove?}, variant? ("md:hover:": style writes md:hover: classes, or a media/:hover rule in a plain HTML file)} -> DirectEditResult with tailwind? (409 while a run is active, 422 when the source cannot be patched); also takes DirectEditBatch {edits} (1-50 style/text edits) -> DirectEditBatchResult with one version, and StructureEditRequest {op: delete|duplicate|wrap|unwrap|move|group, targets, into?|before?|after?} -> StructureEditResult with one version, and {replaceStyle: {matches, token}} (style search and replace, up to 500 matches; .map() copies and className built in code are skipped with a reason) -> StyleReplaceResult with one version, and {arrange: ArrangeRequest} (align, distribute or tidy up siblings: parent justify/align/gap in an auto layout, left/top for absolute children; refusals are 422 with the reason) -> ArrangeResult with one version',
  elementClasses: 'GET /api/projects/:pid/d/:did/classes?file&line&col&variant? -> {tailwind: TailwindOutcome | null, element: ElementSourceInfo | null, variants: VariantSupport} (the class list of the element, whether style edits write classes or inline style, the component name when the JSX element is a component use, whether its className reads the className prop, and the data expression its text comes from)',
  versionPreview: 'GET /api/projects/:pid/versions/:vid/preview -> {url}',
  exportVersion: 'GET /api/projects/:pid/versions/:vid/export -> application/zip',
  renameVersion: 'PATCH /api/projects/:pid/versions/:vid {name: string|null} -> {id, name} (trimmed, max 80, empty or null removes)',
  versionThumb: 'GET /api/projects/:pid/versions/:vid/thumb -> image/png 640x400 (rendered on first request, 404 no_page)',
  versionDiff: 'GET /api/projects/:pid/versions/:vid/diff/:other?w=&h= -> image/png mask, red where the first viewport changed (x-changed-pct)',
  getRun: 'GET /api/runs/:runId -> {summary, events}',
  cancelRun: 'POST /api/runs/:runId/cancel -> {ok}',
  postTelemetry: 'POST /api/telemetry TelemetrySample -> {ok}',
  getTelemetry: 'GET /api/telemetry?projectId= -> TelemetrySample[]',
  appDoctor: 'GET /api/projects/:pid/app/doctor?fresh=1 -> {status, doctor: AppDoctorResult} (classifies the dev log of the current start and one request to the app root; fresh=1 requests the root again)',
  appFix: 'POST /api/projects/:pid/app/doctor/fix {kind} -> AppFixResult (runs the doctor again and applies only the fix it computed, then restarts the dev server; 409 when the doctor no longer sees that problem)',
  setImage: 'POST /api/projects/:pid/d/:did/image SetImageRequest {target, mode? (auto|img|background|insert), image? {name, data base64} | url? (https, 10 MB, image types), fit? (cover|contain|fill), focal? ("x% y%"), alt?, position? (inside|after)} -> SetImageResult (copies the file into the assets folder with a content-hashed name: the app public/ for Next and Vite, assets/ for HTML; writes src, alt, object-fit/position or background-* as one version)',
} as const;

export const STUDIO_TOKEN_HEADER = 'x-studio-token';
export const BRIDGE_TOKEN_PARAM = '__studio_token';
export const BRIDGE_PARENT_ORIGIN_PARAM = '__studio_parent';
export const BRIDGE_PASSIVE_PARAM = '__studio_passive';
export const ELEMENT_MARK_PARAM = '__studio_mark';
export const SOURCE_LOC_ATTR = 'data-studio-loc';
export const BRIDGE_SCRIPT_PATH = '/__studio/bridge.js';
export const BRIDGE_CHANGES_PATH = '/__studio/changes';

export type PlayKey = 'exit' | 'restart' | 'back';

export type LinkRect = NonNullable<LinkRectReport['rect']>;

export type BridgeToParent =
  | { ns: 'studio'; token: string; type: 'ready'; url: string; redirectedFrom?: string }
  | { ns: 'studio'; token: string; type: 'painted'; at: number }
  | { ns: 'studio'; token: string; type: 'hover'; rect: SelectionContext['rect'] | null; label?: string; altKey?: boolean; node?: number; source?: 'tree' }
  | { ns: 'studio'; token: string; type: 'select'; selection: SelectionContext; additive: boolean; at: number; node?: number }
  | { ns: 'studio'; token: string; type: 'tree'; nodes: LayerNode[]; truncated: boolean }
  | { ns: 'studio'; token: string; type: 'rects'; selectors: string[]; rects: (SelectionContext['rect'] | null)[] }
  | { ns: 'studio'; token: string; type: 'styles-found'; requestId: string; result: StyleScanResult; selected: number }
  | { ns: 'studio'; token: string; type: 'error'; kind: 'console' | 'runtime' | 'unhandledrejection'; message: string; stack?: string; source?: string; line?: number }
  | { ns: 'studio'; token: string; type: 'scroll' }
  | { ns: 'studio'; token: string; type: 'mode-exited' }
  | { ns: 'studio'; token: string; type: 'escape' }
  | {
      ns: 'studio';
      token: string;
      type: 'wheel';
      deltaX: number;
      deltaY: number;
      deltaMode: number;
      ctrlKey: boolean;
      metaKey: boolean;
      clientX: number;
      clientY: number;
    }
  | { ns: 'studio'; token: string; type: 'zoom-key'; key: ZoomKey; at: number }
  | { ns: 'studio'; token: string; type: 'anchor-rects'; anchors: AnchorReport[] }
  | { ns: 'studio'; token: string; type: 'link-rects'; links: LinkRectReport[] }
  | { ns: 'studio'; token: string; type: 'play-click'; id: string }
  | { ns: 'studio'; token: string; type: 'play-key'; key: PlayKey }
  | { ns: 'studio'; token: string; type: 'anchor-contexts'; requestId: string; contexts: (SelectionContext | null)[] }
  | { ns: 'studio'; token: string; type: 'text-edit'; selector: string; state: 'start' | 'cancel' }
  | { ns: 'studio'; token: string; type: 'text-commit'; selector: string; text: string; at: number }
  | { ns: 'studio'; token: string; type: 'history-key'; redo: boolean }
  | { ns: 'studio'; token: string; type: 'layout-key' }
  | { ns: 'studio'; token: string; type: 'app-key'; id: AppKey }
  | { ns: 'studio'; token: string; type: 'context-menu'; x: number; y: number }
  | { ns: 'studio'; token: string; type: 'reorder-key'; selector: string; move: ReorderMove }
  | { ns: 'studio'; token: string; type: 'structure-key'; selector: string; key: StructureKey }
  | { ns: 'studio'; token: string; type: 'authored'; requestId: string; rules: AuthoredRule[]; inline: string }
  | { ns: 'studio'; token: string; type: 'element-at'; requestId: string; selection: SelectionContext | null; inside: boolean; label: string }
  | { ns: 'studio'; token: string; type: 'neighbors'; requestId: string; parent: SelectionContext['rect'] | null; siblings: SelectionContext['rect'][] }
  | { ns: 'studio'; token: string; type: 'arrange-key'; key: string }
  | { ns: 'studio'; token: string; type: 'optimistic-result'; id: string; outcome: OptimisticOutcome; reason?: string; ms: number }
  | { ns: 'studio'; token: string; type: 'play-layers'; layers: Record<string, LinkRect> }
  | { ns: 'studio'; token: string; type: 'marquee'; rect: SelectionContext['rect'] | null }
  | { ns: 'studio'; token: string; type: 'select-many'; selections: SelectionContext[]; additive: boolean; at: number; node?: number }
  | { ns: 'studio'; token: string; type: 'matched'; requestId: string; count: number; note?: string }
  | { ns: 'studio'; token: string; type: 'locks'; keys: string[] }
  | { ns: 'studio'; token: string; type: 'file-drop'; files: File[]; selection: SelectionContext | null; inside: boolean; label: string; rect: SelectionContext['rect'] | null };

export interface LayerNode {
  id: number;
  depth: number;
  tag: string;
  name: string;
  text: string;
  childCount: number;
  hidden: boolean;
  loc?: string;
  ref?: string;
  locked?: boolean;
}

export const MATCH_KINDS = ['component', 'classes', 'text-style'] as const;
export type MatchKind = (typeof MATCH_KINDS)[number];
export const MATCH_SELECT_MAX = 200;

export const LAYER_TREE_MAX = 5000;
export const LAYER_LABEL_MAX = 60;

export type SelectMove = 'child' | 'parent' | 'next' | 'prev';

export type AppKey = 'palette' | 'shortcuts' | 'next-region' | 'prev-region';

export function appKeyOf(event: { key: string; code: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }, typing: boolean): AppKey | null {
  if (event.altKey) return null;
  if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.code === 'KeyK') return 'palette';
  if (event.key === '?' && !event.metaKey && (event.ctrlKey || !typing)) return 'shortcuts';
  if (event.key === 'F6' && !event.metaKey && !event.ctrlKey) return event.shiftKey ? 'prev-region' : 'next-region';
  return null;
}

export function selectMoveOf(event: { key: string; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean }): SelectMove | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (event.key === 'Enter') return event.shiftKey ? 'parent' : 'child';
  if (event.key === 'Tab') return event.shiftKey ? 'prev' : 'next';
  return null;
}

export type ZoomKey = 'in' | 'out' | 'actual' | 'fit' | 'selection';

export interface ZoomKeyInput {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const MOD_ZOOM_KEYS: Record<string, ZoomKey> = { '=': 'in', '+': 'in', '-': 'out', _: 'out' };
const MOD_ZOOM_CODES: Record<string, ZoomKey> = { Digit0: 'actual', Digit1: 'fit', Digit2: 'selection' };
const SHIFT_ZOOM_CODES: Record<string, ZoomKey> = { Digit0: 'actual', Digit1: 'fit', Digit2: 'selection' };
const BARE_ZOOM_KEYS: Record<string, ZoomKey> = { '=': 'in', '+': 'in', '-': 'out' };

export function zoomKeyOf(event: ZoomKeyInput): ZoomKey | null {
  if (event.altKey) return null;
  if (event.ctrlKey || event.metaKey) return MOD_ZOOM_CODES[event.code] ?? MOD_ZOOM_KEYS[event.key] ?? null;
  if (event.shiftKey && SHIFT_ZOOM_CODES[event.code]) return SHIFT_ZOOM_CODES[event.code] ?? null;
  return BARE_ZOOM_KEYS[event.key] ?? null;
}

export function isModZoomKey(event: ZoomKeyInput): boolean {
  return event.ctrlKey || event.metaKey;
}

export type ParentToBridge =
  | { ns: 'studio'; token: string; type: 'set-mode'; mode: 'select' | 'none'; marquee?: boolean }
  | { ns: 'studio'; token: string; type: 'request-rects'; selectors: string[] }
  | { ns: 'studio'; token: string; type: 'clear' }
  | { ns: 'studio'; token: string; type: 'preview-style'; selector: string; style: Record<string, string | null> }
  | { ns: 'studio'; token: string; type: 'preview-text'; selector: string; text: string }
  | { ns: 'studio'; token: string; type: 'preview-reset' }
  | { ns: 'studio'; token: string; type: 'tokens-preview'; css: string }
  | { ns: 'studio'; token: string; type: 'tweaks-preview'; css: string }
  | { ns: 'studio'; token: string; type: 'lofi-preview'; css: string }
  | { ns: 'studio'; token: string; type: 'set-theme'; theme: 'light' | 'dark' | null }
  | { ns: 'studio'; token: string; type: 'force-state'; selector: string | null; states: ('hover' | 'focus' | 'active')[]; dark: boolean; track: boolean }
  | { ns: 'studio'; token: string; type: 'track-anchors'; anchors: AnchorQuery[] }
  | { ns: 'studio'; token: string; type: 'track-links'; links: LinkQuery[] }
  | { ns: 'studio'; token: string; type: 'play-links'; links: LinkQuery[] | null }
  | { ns: 'studio'; token: string; type: 'describe-anchors'; requestId: string; anchors: AnchorQuery[] }
  | { ns: 'studio'; token: string; type: 'request-tree' }
  | { ns: 'studio'; token: string; type: 'hover-node'; id: number | null }
  | { ns: 'studio'; token: string; type: 'select-node'; id: number; additive: boolean }
  | { ns: 'studio'; token: string; type: 'select-relative'; selector: string; move: SelectMove }
  | { ns: 'studio'; token: string; type: 'text-edit-allowed'; allowed: boolean }
  | { ns: 'studio'; token: string; type: 'text-edit-stop' }
  | { ns: 'studio'; token: string; type: 'request-authored'; requestId: string; selector: string }
  | { ns: 'studio'; token: string; type: 'element-at'; requestId: string; x: number; y: number }
  | { ns: 'studio'; token: string; type: 'select-source'; sourceLoc: string; tag: string; text: string }
  | { ns: 'studio'; token: string; type: 'select-selector'; selector: string }
  | { ns: 'studio'; token: string; type: 'select-at'; x: number; y: number }
  | { ns: 'studio'; token: string; type: 'find-styles'; requestId: string; query: StyleQuery; select?: boolean }
  | { ns: 'studio'; token: string; type: 'request-neighbors'; requestId: string; selector: string }
  | { ns: 'studio'; token: string; type: 'optimistic-apply'; id: string; patch: DomPatch; written: boolean }
  | { ns: 'studio'; token: string; type: 'optimistic-settle'; id: string; ok: boolean; classes?: ClassDelta; reason?: string }
  | { ns: 'studio'; token: string; type: 'optimistic-drop' }
  | { ns: 'studio'; token: string; type: 'play-fx'; layers: Record<string, LinkRect>; duration: number; easing: string }
  | { ns: 'studio'; token: string; type: 'select-matching'; requestId: string; selector: string; by: MatchKind }
  | { ns: 'studio'; token: string; type: 'set-locks'; keys: string[] }
  | { ns: 'studio'; token: string; type: 'lock-node'; id: number; locked: boolean };

export interface ClassDelta {
  add: string[];
  remove: string[];
}

export interface DomPatch {
  selector: string;
  loc?: string;
  tag?: string;
  trusted?: boolean;
  style?: Record<string, string | null>;
  classes?: ClassDelta;
  text?: string;
}

export type OptimisticOutcome = 'confirmed' | 'mismatch' | 'timeout' | 'skipped';

export const DIRECT_STYLE_PROPERTIES = [
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-align',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'border-radius',
  'border-width',
  'border-style',
  'border-color',
  'display',
  'gap',
  'width',
  'height',
  'opacity',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-self',
  'flex',
  'box-shadow',
  'filter',
  'font-style',
  'text-decoration-line',
  'text-transform',
  'overflow',
  'text-shadow',
  'transform',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'row-gap',
  'column-gap',
  'justify-items',
  'object-fit',
  'object-position',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
] as const;

export type DirectStyleProperty = (typeof DIRECT_STYLE_PROPERTIES)[number];

export interface DirectEditRequest {
  source: SourceLoc;
  selector: string;
  tag?: string;
  style?: Partial<Record<DirectStyleProperty, string | null>>;
  text?: string;
  name?: string | null;
  move?: ReorderMove;
  insert?: InsertKind;
  classes?: ClassChange;
  component?: string;
  variant?: string;
  hints?: TextSourceHints;
}

export interface ClassChange {
  add?: string[];
  remove?: string[];
}

export interface TailwindOutcome {
  mode: 'classes' | 'inline' | 'none';
  classes: string[];
  delta?: ClassDelta;
  dynamic: boolean;
  note: string | null;
}

export type ReorderMove = 'up' | 'down';

export const INSERT_KINDS = ['text', 'frame', 'rect', 'ellipse'] as const;
export type InsertKind = (typeof INSERT_KINDS)[number];

export interface DirectEditBatch {
  edits: DirectEditRequest[];
}

export const STRUCTURE_OPS = ['delete', 'duplicate', 'wrap', 'unwrap', 'move', 'clear', 'group'] as const;
export type StructureOp = (typeof STRUCTURE_OPS)[number];

export interface StructureTarget {
  source: SourceLoc;
  selector?: string;
  tag?: string;
}

export interface StructureEditRequest {
  op: StructureOp;
  targets: StructureTarget[];
  into?: StructureTarget;
  before?: StructureTarget;
  after?: StructureTarget;
}

export interface StructureEditResult {
  files: string[];
  version: Version;
  select: (SourceLoc & { tag: string })[];
}

export type StructureKey = 'delete' | 'duplicate' | 'wrap' | 'unwrap' | 'cut' | 'paste' | 'group';

export interface EditHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
}

export interface EditHistoryEntry {
  label: string;
  versionId: string;
  files: string[];
}

export interface EditHistoryList {
  undo: EditHistoryEntry[];
  redo: EditHistoryEntry[];
}

export interface EditSessionState {
  baseVersionId: string;
  count: number;
  dirty: boolean;
  blocked: string | null;
  outside?: number;
}

export interface EditSessionEnd {
  version: Version | null;
  headVersionId: string;
}

export interface AuthoredRule {
  selector: string;
  css: string;
  source: string | null;
}

export interface DirectEditResult {
  file: string;
  version: Version;
  applied: { style: string[]; text: boolean; classes?: boolean };
  moved?: SourceLoc;
  tailwind?: TailwindOutcome;
  textSource?: TextSourceInfo;
}

export interface DirectEditBatchResult {
  files: string[];
  version: Version;
  applied: { file: string; style: string[]; text: boolean; classes?: boolean; tailwind?: TailwindOutcome; textSource?: TextSourceInfo }[];
}

const PREVIEW_HOST_SUFFIX = '.localhost';

export function projectPreviewHost(projectId: string): string {
  const hex = [...new TextEncoder().encode(projectId)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `p-${hex}${PREVIEW_HOST_SUFFIX}`;
}

export function projectPreviewOrigin(projectId: string, previewPort: number): string {
  return `http://${projectPreviewHost(projectId)}:${previewPort}`;
}

export const DEFAULT_STUDIO_PORT = 4170;
export const DEFAULT_PREVIEW_PORT = 4171;
export const DEFAULT_VITE_PORT_BASE = 5200;

export const LEGACY_DEFAULT_BUDGET_USD = 2;
export const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS: ProjectSettings = {
  model: 'claude-sonnet-5-5',
  maxBudgetUsd: null,
  maxTurns: 40,
  allowBash: true,
  allowInstall: true,
  autoApprove: true,
  disabledSkills: [],
  defaultLevel: 'prototype',
};

export const DESIGN_SYSTEM_DIR = 'design-system';
export const TOKENS_FILE = 'design-system/tokens.json';
export const TOKENS_CSS_FILE = 'design-system/tokens.css';
export const PACK_FILE = 'design-system/pack.json';
export const DESIGN_MD_TOKENS_START = '<!-- studio:tokens:start -->';
export const DESIGN_MD_TOKENS_END = '<!-- studio:tokens:end -->';

export type TokenType = 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'number' | 'shadow' | 'duration' | 'other';

export interface DesignToken {
  $value: string;
  $type?: TokenType;
  $description?: string;
  $extensions?: { 'studio.modes'?: { dark?: string } };
}

export interface TokenGroup {
  $type?: TokenType;
  $description?: string;
  [name: string]: DesignToken | TokenGroup | string | undefined;
}

export interface TokenFile {
  $schema?: string;
  $description?: string;
  color: TokenGroup;
  font: TokenGroup;
  text: TokenGroup;
  space: TokenGroup;
  radius: TokenGroup;
  shadow: TokenGroup;
  [group: string]: TokenGroup | string | undefined;
}

export const REQUIRED_TOKENS = {
  color: ['bg', 'surface', 'fg', 'fg-muted', 'border', 'primary', 'primary-fg', 'accent', 'accent-fg', 'success', 'warning', 'danger', 'ring'],
  font: ['display', 'body', 'mono'],
  text: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'],
  space: ['1', '2', '3', '4', '5', '6', '8', '10', '12'],
  radius: ['sm', 'md', 'lg', 'pill'],
  shadow: ['sm', 'md', 'lg'],
} as const;

export interface PackManifest {
  id: string;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  tags: string[];
  license: string;
  provenance: 'original' | 'imported' | 'extracted';
  fonts: { display: string; body: string; mono: string; googleFontsUrl?: string };
  draft?: boolean;
  copiedFrom?: string;
}

export type PackSource = 'builtin' | 'user';

export interface PackSummary extends PackManifest {
  source: PackSource;
  swatches: { name: string; value: string }[];
  darkSwatches?: { name: string; value: string }[];
}

export interface PackDetail {
  summary: PackSummary;
  tokensJson: string;
  designMd: string;
  entries: CompiledTokenEntry[];
}

export type ImportPackMode = 'ask' | 'replace' | 'copy';

export interface ImportPackResult {
  pack: PackSummary;
  replaced: boolean;
}

export interface OpenPackEditorResult {
  project: Project;
  created: boolean;
}

export interface PackProblem {
  id: string;
  source: PackSource;
  errors: string[];
}

export type DraftSourceKind = 'tokens-file' | 'folder' | 'url' | 'design-md' | 'brief';

export interface DraftSourceReport {
  kind: DraftSourceKind | 'images';
  label: string;
  ok: boolean;
  found: number;
  error?: string;
}

export type DraftSourceState = 'queued' | 'reading' | 'read' | 'thin' | 'blocked' | 'failed';

export interface DraftSourceStatus {
  id: string;
  kind: DraftSourceKind | 'images';
  label: string;
  state: DraftSourceState;
  detail: string;
  note?: string;
  method?: 'browser' | 'static';
  ms?: number;
}

export interface DraftImproveStart {
  state: 'waiting' | 'started' | 'skipped';
  runId?: string;
  reason?: string;
}

export interface DraftSourcesState {
  sources: DraftSourceStatus[];
  done: boolean;
  startedAt: number;
  finishedAt?: number;
  improve: DraftImproveStart;
}

export type CoverageConfidence = 'high' | 'medium' | 'fallback';

export interface CoverageEntry {
  token: string;
  source: DraftSourceKind | 'derived' | 'base' | 'agent' | 'library';
  confidence: CoverageConfidence;
  evidence: string;
  verified?: boolean;
}

export type CoverageGrade = 'excellent' | 'usable' | 'needs-review' | 'rebuild';

export interface DesignSystemCoverage {
  version: 1;
  score: number;
  grade: CoverageGrade;
  basePackId: string;
  mode: 'light' | 'dark';
  tokens: CoverageEntry[];
  fallbacks: string[];
  sources: DraftSourceReport[];
}

export interface DesignSystemDraftRequest {
  name?: string;
  mode?: 'light' | 'dark' | 'auto';
  basePackId?: string;
  urls?: string[];
  designMd?: string;
  brief?: string;
  folderPath?: string;
  tokensFile?: { name: string; text: string };
}

export interface DesignSystemDraftResult {
  project: Project;
  pack: PackSummary;
  coverage: DesignSystemCoverage;
  ms: number;
}

export type DesignSystemCheckRule = 'tokens' | 'contrast' | 'design-md' | 'kit-colors' | 'fonts';

export interface DesignSystemCheckProblem {
  rule: DesignSystemCheckRule;
  message: string;
}

export interface DesignSystemCheckResult {
  passed: boolean;
  problems: DesignSystemCheckProblem[];
}

export interface DesignSystemRunCheck extends DesignSystemCheckResult {
  rounds: number;
}

export interface DesignSystemDraftInfo {
  packId: string;
  coverage: DesignSystemCoverage | null;
  check: DesignSystemCheckResult;
  sources?: DraftSourcesState | null;
}

export interface CreateUserPackInput {
  name: string;
  description?: string;
  mode: PackManifest['mode'];
  fonts: PackManifest['fonts'];
  tokensJson: string | Record<string, unknown>;
  designMd: string;
  provenance: PackManifest['provenance'];
  tags?: string[];
  license?: string;
  draft?: boolean;
  copiedFrom?: string;
}

export type UpdateUserPackInput = Partial<CreateUserPackInput>;

export interface ApplyPackResult {
  project: Project;
  state: DesignSystemState;
  version: Version;
  written: string[];
  wired: boolean;
  notice: string | null;
}

export interface SavePackResult {
  pack: PackSummary;
  created: boolean;
  project: Project;
  version: Version | null;
}

export interface TokenSourceLocation {
  file: string;
  line: number;
  value: string;
  darkLine: number | null;
  darkValue: string | null;
  lines: number[];
}

export interface CompiledTokenEntry {
  path: string;
  cssVar: string;
  type: TokenType;
  value: string;
  darkValue: string | null;
  description?: string;
  source?: TokenSourceLocation;
}

export interface AppTokenSource {
  kind: 'css';
  file: string;
  tailwind: boolean;
  declarations: number;
  tokens: number;
  darkTokens: number;
}

export interface DesignSystemState {
  packId: string | null;
  manifest: PackManifest | null;
  tokens: TokenFile | null;
  entries: CompiledTokenEntry[];
  css: string | null;
  errors: string[];
  source?: AppTokenSource | null;
}

export type TokenGroupName = 'color' | 'font' | 'text' | 'space' | 'radius' | 'shadow';

export const TOKEN_GROUP_FOR_PROPERTY: Partial<Record<DirectStyleProperty, TokenGroupName>> = {
  color: 'color',
  'background-color': 'color',
  'border-color': 'color',
  'font-family': 'font',
  'font-size': 'text',
  'padding-top': 'space',
  'padding-right': 'space',
  'padding-bottom': 'space',
  'padding-left': 'space',
  'margin-top': 'space',
  'margin-right': 'space',
  'margin-bottom': 'space',
  'margin-left': 'space',
  gap: 'space',
  'border-radius': 'radius',
};

export const TOKEN_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface CreateTokenRequest {
  group: TokenGroupName;
  name: string;
  value: string;
  darkValue?: string;
  description?: string;
  apply?: DirectEditRequest;
}

export interface CreateTokenResult {
  state: DesignSystemState;
  cssVar: string;
  version: Version;
  edit: DirectEditResult | null;
}

export interface TokenMatch {
  cssVar: string;
  path: string;
  value: string;
  distance: number;
  exact: boolean;
}

export const TOKEN_PREVIEW_STYLE_ID = 'studio-token-preview';

export interface TokenChange {
  path: string;
  value?: string;
  darkValue?: string | null;
}

export interface TokenPreviewResult {
  css: string;
  errors: string[];
}

export interface UpdateTokensResult {
  state: DesignSystemState;
  version: Version;
}
