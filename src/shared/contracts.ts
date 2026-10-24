export type ProjectKind = 'html' | 'react';

export interface ProjectSettings {
  model: string;
  maxBudgetUsd: number | null;
  maxTurns: number;
  allowBash: boolean;
  allowInstall: boolean;
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
  entry: string;
  settings: ProjectSettings;
  settingsVersion?: number;
  directions: Direction[];
  thumbnail?: ProjectThumbnail | null;
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

export type VersionKind = 'init' | 'run' | 'undo' | 'restore' | 'keep' | 'fork' | 'manual';

export interface VersionMeta {
  kind: VersionKind;
  runId?: string;
  prompt?: string;
  restoredFrom?: string;
  directionId?: string;
  level?: RunLevel;
}

export interface Version {
  id: string;
  directionId: string;
  parentId: string | null;
  title: string;
  meta: VersionMeta;
  createdAt: number;
  changedFiles: string[];
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
  ancestors: string[];
}

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  path: string;
}

export type RunMode = 'edit' | 'critique';
export type RunTask = 'tweaks' | 'design-system';

export interface RunRequest {
  prompt: string;
  mode: RunMode;
  level?: RunLevel;
  variation?: VariationBrief & { index: number; count: number };
  reference?: ReferenceElement;
  selection?: SelectionContext[];
  attachmentIds?: string[];
  comments?: RunComment[];
  task?: RunTask;
  referencePages?: ReferencePage[];
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
}

export interface RunComment {
  id: string;
  n: number;
  text: string;
  element: SelectionContext | null;
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

export interface FinalCheck {
  ranBy: 'agent' | 'studio';
  errors: number;
  high: number;
  medium: number;
  low: number;
}

export type RunStatus = 'running' | 'completed' | 'canceled' | 'failed' | 'budget_exceeded';

export interface RunUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface ToolCallRecord {
  toolUseId: string;
  name: string;
  input: unknown;
  startedAt: number;
  finishedAt: number | null;
  isError: boolean;
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
  | { type: 'run.thinking'; runId: string; text: string }
  | { type: 'run.tool.started'; runId: string; toolUseId: string; name: string; input: unknown }
  | { type: 'run.tool.finished'; runId: string; toolUseId: string; isError: boolean; summary: string; durationMs: number }
  | { type: 'run.finished'; runId: string; summary: RunSummary }
  | { type: 'files.changed'; paths: string[]; changedAt: number }
  | { type: 'version.created'; version: Version }
  | { type: 'direction.updated'; direction: Direction }
  | { type: 'status.changed'; status: WorkTreeStatus }
  | { type: 'preview.build-error'; message: string; file?: string; line?: number; frame?: string }
  | { type: 'comments.changed'; comments: DesignComment[] };

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

export interface TelemetrySample {
  kind: 'preview.latency' | 'select.latency' | 'studio.open' | 'file.write';
  projectId: string;
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

export type QualityCheckName = 'a11y' | 'tap-target' | 'placeholder' | 'tokens' | 'nav-mobile' | 'visual-diff' | 'generic-layout' | 'duplicate-content';

export type QualitySeverity = 'high' | 'medium' | 'low';

export interface QualityFinding {
  check: QualityCheckName;
  severity: QualitySeverity;
  viewport: CheckViewport | null;
  selector: string | null;
  source: string | null;
  message: string;
  fix?: string;
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
  savePack: 'POST /api/projects/:pid/d/:did/design-system/save {name, packId?, asNew?} -> SavePackResult (asNew creates a new user pack; else updates packId, else the user pack named in pack.json, else creates one; then pack.json names the saved pack, one version "Save <name> to library" when it changed; 400 built-in packId or invalid files, 404 no design system, 409 run active)',
  getDesignSystem: 'GET /api/projects/:pid/d/:did/design-system -> DesignSystemState',
  previewTokens: 'POST /api/projects/:pid/d/:did/design-system/preview {changes: TokenChange[]} -> TokenPreviewResult (no files written)',
  updateTokens: 'POST /api/projects/:pid/d/:did/design-system/tokens/update {changes: TokenChange[]} -> UpdateTokensResult (one version; 409 run active, 422 invalid, 404 unknown path)',
  createToken: 'POST /api/projects/:pid/d/:did/design-system/tokens CreateTokenRequest -> CreateTokenResult (409 run active, 409 token_exists, 422 invalid, 404 no design system)',
  importProject: 'POST /api/projects/import {path} -> {project}',
  createDesignSystemDraft: 'POST /api/design-systems/draft (JSON DraftRequest, or multipart: request = JSON text, tokensFile = file, images = files) -> DesignSystemDraftResult (draft user pack + backing HTML project "<name> design system" with a kit page and source/; one version; 400 no source, blocked URL, bad tokens file or folder)',
  getDesignSystemDraft: 'GET /api/projects/:pid/design-system-draft -> DesignSystemDraftInfo (404 when the project is not a design-system project)',
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
  createComment: 'POST /api/projects/:pid/d/:did/comments {text, target, context?, status?: draft|queued} -> DesignComment',
  updateComment: 'PATCH /api/projects/:pid/d/:did/comments/:cid {text?, status?, target?, context?} -> DesignComment (409 bad_transition)',
  deleteComment: 'DELETE /api/projects/:pid/d/:did/comments/:cid -> {ok}',
  reorderComments: 'POST /api/projects/:pid/d/:did/comments/reorder {ids} -> DesignComment[]',
  sendComments: 'POST /api/projects/:pid/d/:did/comments/send {ids?, contexts?, level?} -> {runId, comments} (409 run_in_progress: comments stay queued)',
  directEdit: 'POST /api/projects/:pid/d/:did/direct-edit DirectEditRequest -> DirectEditResult (409 while a run is active, 422 when the source cannot be patched)',
  versionPreview: 'GET /api/projects/:pid/versions/:vid/preview -> {url}',
  exportVersion: 'GET /api/projects/:pid/versions/:vid/export -> application/zip',
  getRun: 'GET /api/runs/:runId -> {summary, events}',
  cancelRun: 'POST /api/runs/:runId/cancel -> {ok}',
  postTelemetry: 'POST /api/telemetry TelemetrySample -> {ok}',
  getTelemetry: 'GET /api/telemetry?projectId= -> TelemetrySample[]',
} as const;

export const STUDIO_TOKEN_HEADER = 'x-studio-token';
export const BRIDGE_TOKEN_PARAM = '__studio_token';
export const BRIDGE_PARENT_ORIGIN_PARAM = '__studio_parent';
export const SOURCE_LOC_ATTR = 'data-studio-loc';
export const BRIDGE_SCRIPT_PATH = '/__studio/bridge.js';
export const BRIDGE_CHANGES_PATH = '/__studio/changes';

export type BridgeToParent =
  | { ns: 'studio'; token: string; type: 'ready'; url: string }
  | { ns: 'studio'; token: string; type: 'painted'; at: number }
  | { ns: 'studio'; token: string; type: 'hover'; rect: SelectionContext['rect'] | null; label?: string }
  | { ns: 'studio'; token: string; type: 'select'; selection: SelectionContext; additive: boolean; at: number }
  | { ns: 'studio'; token: string; type: 'rects'; selectors: string[]; rects: (SelectionContext['rect'] | null)[] }
  | { ns: 'studio'; token: string; type: 'error'; kind: 'console' | 'runtime' | 'unhandledrejection'; message: string; stack?: string; source?: string; line?: number }
  | { ns: 'studio'; token: string; type: 'scroll' }
  | { ns: 'studio'; token: string; type: 'mode-exited' }
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
  | { ns: 'studio'; token: string; type: 'zoom-key'; key: ZoomKey }
  | { ns: 'studio'; token: string; type: 'anchor-rects'; anchors: AnchorReport[] }
  | { ns: 'studio'; token: string; type: 'anchor-contexts'; requestId: string; contexts: (SelectionContext | null)[] };

export type ZoomKey = '=' | '-' | '0' | '1';

const ZOOM_KEY_MAP: Record<string, ZoomKey> = { '=': '=', '+': '=', '-': '-', _: '-', '0': '0', '1': '1' };

export function zoomKeyOf(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): ZoomKey | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  return ZOOM_KEY_MAP[event.key] ?? null;
}

export type ParentToBridge =
  | { ns: 'studio'; token: string; type: 'set-mode'; mode: 'select' | 'none' }
  | { ns: 'studio'; token: string; type: 'request-rects'; selectors: string[] }
  | { ns: 'studio'; token: string; type: 'clear' }
  | { ns: 'studio'; token: string; type: 'preview-style'; selector: string; style: Record<string, string | null> }
  | { ns: 'studio'; token: string; type: 'preview-text'; selector: string; text: string }
  | { ns: 'studio'; token: string; type: 'preview-reset' }
  | { ns: 'studio'; token: string; type: 'tokens-preview'; css: string }
  | { ns: 'studio'; token: string; type: 'tweaks-preview'; css: string }
  | { ns: 'studio'; token: string; type: 'set-theme'; theme: 'light' | 'dark' | null }
  | { ns: 'studio'; token: string; type: 'track-anchors'; anchors: AnchorQuery[] }
  | { ns: 'studio'; token: string; type: 'describe-anchors'; requestId: string; anchors: AnchorQuery[] };

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
] as const;

export type DirectStyleProperty = (typeof DIRECT_STYLE_PROPERTIES)[number];

export interface DirectEditRequest {
  source: SourceLoc;
  selector: string;
  tag?: string;
  style?: Partial<Record<DirectStyleProperty, string | null>>;
  text?: string;
}

export interface DirectEditResult {
  file: string;
  version: Version;
  applied: { style: string[]; text: boolean };
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
  allowBash: false,
  allowInstall: false,
  disabledSkills: [],
  defaultLevel: 'prototype',
};

export const DESIGN_SYSTEM_DIR = 'design-system';
export const TOKENS_FILE = 'design-system/tokens.json';
export const TOKENS_CSS_FILE = 'design-system/tokens.css';
export const PACK_FILE = 'design-system/pack.json';
export const DESIGN_MD_TOKENS_START = '<!-- studio:tokens:start -->';
export const DESIGN_MD_TOKENS_END = '<!-- studio:tokens:end -->';

export type TokenType = 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'number' | 'shadow' | 'duration';

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
}

export type PackSource = 'builtin' | 'user';

export interface PackSummary extends PackManifest {
  source: PackSource;
  swatches: { name: string; value: string }[];
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

export type CoverageConfidence = 'high' | 'medium' | 'fallback';

export interface CoverageEntry {
  token: string;
  source: DraftSourceKind | 'derived' | 'base' | 'agent';
  confidence: CoverageConfidence;
  evidence: string;
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

export interface CompiledTokenEntry {
  path: string;
  cssVar: string;
  type: TokenType;
  value: string;
  darkValue: string | null;
  description?: string;
}

export interface DesignSystemState {
  packId: string | null;
  manifest: PackManifest | null;
  tokens: TokenFile | null;
  entries: CompiledTokenEntry[];
  css: string | null;
  errors: string[];
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
