import type { AppFixResult, DoctorCauseKind } from "../shared/app-doctor";
import type { CanvasFile } from "../shared/canvas-file";
import type {
  AppLogLine,
  AppRoute,
  AppServerStatus,
  AttachAppRequest,
  AttachedApp,
  CanvasPresence,
  FirstVersionState,
  PermissionDecision,
  QueuedMessage,
  SourceLoc,
  TextSourceAnswer,
  TextSourceHints,
  Attachment,
  ClarifyQuestion,
  Starter,
  TrashedProject,
  DirectEditRequest,
  CreateTokenRequest,
  CreateTokenResult,
  DesignSystemState,
  DirectEditBatch,
  DirectEditBatchResult,
  StructureEditRequest,
  StructureEditResult,
  DirectEditResult,
  TailwindOutcome,
  ElementSourceInfo,
  EditHistoryState,
  EditSessionEnd,
  EditSessionState,
  Direction,
  Project,
  PackSummary,
  ProjectKind,
  ProjectSettings,
  ApplyPackResult,
  SavePackResult,
  DesignSystemDraftInfo,
  DesignSystemCheckResult,
  ImportPackMode,
  ImportPackResult,
  OpenPackEditorResult,
  PackDetail,
  PackProblem,
  DesignSystemDraftResult,
  SkillCatalog,
  RenderCheckResult,
  RunLevel,
  RunRequest,
  RunSummary,
  StudioEvent,
  TokenChange,
  TokenPreviewResult,
  UpdateTokensResult,
  TelemetrySample,
  Version,
  WorkTreeStatus,
} from "../shared/contracts";
import { STUDIO_TOKEN_HEADER } from "../shared/contracts";
import type {
  BlendMode,
  BlendProperty,
  FillBlend,
  FillInfo,
  FillSpec,
  FillType,
  RadialForm,
} from "../shared/fill";
import type { WorkspaceFolder, WorkspaceList } from "../shared/folders";
import type { IconList, IconPosition, IconSource } from "../shared/icons";
import type { InsertTarget } from "../shared/insert";
import type {
  MotionInfo,
  MotionKind,
  MotionSetResult,
  MotionState,
  EntrancePreset,
} from "../shared/motion";
import type { FolderInspection } from "../shared/open-app";
import type {
  PageImportRequest,
  PageImportResult,
} from "../shared/page-import";
import type {
  SpacingInfo,
  SpacingProperty,
  SpacingSetResult,
  SpacingSide,
} from "../shared/spacing";
import type {
  StyleReplaceRequest,
  StyleReplaceResult,
} from "../shared/style-search";
import type {
  TextStyleApplyResult,
  TextStyleCreateResult,
  TextStyleList,
} from "../shared/text-styles";

export interface CanvasSnapshot {
  directionId: string;
  canvas: CanvasFile | null;
  hash: string | null;
}

import { routes } from "../shared/actions/studio/routes.js";
import type {
  DesignRulesState,
  DesignRulesTestResult,
} from "../shared/design-rules";
import type {
  ReviewFixResult,
  ReviewRequest,
  ReviewResult,
} from "../shared/review";
import type { FlowInput, FlowResult } from "../shared/route-flow";
import type {
  CommitTweaksResult,
  TweaksState,
  TweakValue,
} from "../shared/tweaks";
import { ApiError, call } from "./platform/http";
import type { WireFields } from "./platform/http";
import { getSession } from "./session";

export { ApiError } from "./platform/http";

export interface IconListQuery {
  query: string;
  library?: IconSource;
  limit?: number;
}

export interface TextStyleTargetBody {
  selector?: string;
  source: SourceLoc;
  tag?: string;
}

export interface MotionSpecBody {
  kind: MotionKind;
  delayMs?: number;
  durationMs?: number;
  easing?: string;
  end?: Record<string, string>;
  preset?: EntrancePreset;
  properties?: string[];
  staggerMs?: number;
  state?: MotionState;
}

export interface FillStopBody {
  color?: string;
  position?: number;
  token?: string;
}

export interface FillInputBody {
  type: FillType;
  angle?: number;
  at?: string;
  blendMode?: BlendMode;
  blendProperty?: BlendProperty;
  color?: string;
  form?: RadialForm;
  stops?: FillStopBody[];
  token?: string;
}

export interface FillSetBody {
  fill: FillInputBody;
  target: TextStyleTargetBody;
}

export interface FillSetReply {
  blend: FillBlend | null;
  files: string[];
  fill: FillSpec;
  mode: "classes" | "css";
  versionId: string;
}

export interface SpacingStep {
  px: number;
  token: string;
}

export interface SpacingBox extends SpacingInfo {
  scale: SpacingStep[];
}

export interface SpacingComputed {
  gap: string;
  margin: string;
  padding: string;
}

export interface SpacingSetBody {
  spacing: {
    property: SpacingProperty;
    side: SpacingSide;
    snap?: boolean;
    token?: string;
    value?: number;
  };
  target: TextStyleTargetBody;
}

export interface MotionSetBody {
  spec: MotionSpecBody;
  target: TextStyleTargetBody;
}

export interface TextStyleApplyBody {
  style: string;
  target: TextStyleTargetBody;
}

export interface TextStyleCreateBody {
  name: string;
  styles: Record<string, string>;
}

export interface TextStyleDetachBody {
  styles: Record<string, string>;
  target: TextStyleTargetBody;
}

export interface IconInsertBody {
  name: string;
  size: number;
  color?: string;
  library?: IconSource;
  position: IconPosition;
  target: InsertTarget;
}

export interface IconInsertReply {
  file: string;
  icon: string;
  importAdded: boolean;
  select: (SourceLoc & { tag: string })[];
  swapped: boolean;
  title: string;
  versionId: string;
}

type ErrorPick = (data: {
  error?: string;
  message?: string;
}) => string | undefined;

const pickError: ErrorPick = (data) => data.error ?? data.message;
const pickMessage: ErrorPick = (data) => data.message ?? data.error;

async function request(
  method: string,
  path: string,
  body?: unknown,
  pick: ErrorPick = pickError
): Promise<Response> {
  const headers: Record<string, string> = {
    [STUDIO_TOKEN_HEADER]: getSession().token,
  };

  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(path, { method, headers, body: payload });

  if (!res.ok) {
    let message = `${method} ${path} failed: ${res.status}`;
    let parsed: (WireFields & { error?: string; message?: string }) | undefined;

    try {
      parsed = (await res.json()) as WireFields & {
        error?: string;
        message?: string;
      };
      message = pick(parsed) ?? message;
    } catch {
      message = `${message} ${res.statusText}`;
    }

    throw new ApiError(res.status, message, parsed?.error, parsed);
  }

  return res;
}

const WARM_MS = 4000;
const warm = new Map<string, { at: number; value: Promise<unknown> }>();

function takeWarm(path: string): Promise<unknown> | null {
  const hit = warm.get(path);

  if (!hit) {
    return null;
  }

  warm.delete(path);

  return Date.now() - hit.at < WARM_MS ? hit.value : null;
}

export function warmGet(path: string): void {
  const hit = warm.get(path);

  if (hit && Date.now() - hit.at < WARM_MS) {
    return;
  }

  const value = request("GET", path).then(
    (res) => res.json() as Promise<unknown>
  );

  value.catch(() => warm.delete(path));
  warm.set(path, { at: Date.now(), value });
}

export async function json<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const early = method === "GET" ? takeWarm(path) : null;

  if (early) {
    try {
      return (await early) as T;
    } catch {
      return json<T>(method, path, body);
    }
  }

  const res = await request(method, path, body);

  return (await res.json()) as T;
}

export async function getBlob(path: string): Promise<Blob> {
  const res = await request("GET", path);

  return res.blob();
}

const enc = encodeURIComponent;

const p = (pid: string) => `/api/projects/${enc(pid)}`;

const d = (pid: string, did: string) => `${p(pid)}/d/${enc(did)}`;

const treeInFlight = new Map<string, Promise<{ files: string[] }>>();

function sharedTree(url: string): Promise<{ files: string[] }> {
  const open = treeInFlight.get(url);

  if (open) {
    return open;
  }

  const next = json<{ files: string[] }>("GET", url).finally(() =>
    treeInFlight.delete(url)
  );

  treeInFlight.set(url, next);

  return next;
}

const pk = (id: string) => `/api/packs/${enc(id)}`;

export function warmProject(pid: string, directionId: string | null): void {
  warmGet(p(pid));
  warmGet(`${p(pid)}/runs`);
  warmGet(`${p(pid)}/canvas`);

  if (directionId) {
    warmGet(`${d(pid, directionId)}/preview`);
  }
}

export const api = {
  listProjects: () => json<Project[]>("GET", "/api/projects"),
  searchProjects: (q: string, project: string | null, limit = 20) =>
    json<import("../shared/project-search").ProjectSearchResult>(
      "GET",
      `/api/project-search?${new URLSearchParams({ q, limit: String(limit), ...(project ? { project } : {}) }).toString()}`
    ),
  createProject: (input: {
    name?: string;
    prompt: string;
    kind: ProjectKind;
    settings?: Partial<ProjectSettings>;
    designMd?: string;
    packId?: string;
    level?: RunLevel;
    startRun?: boolean;
    parentPath?: string;
    referenceUrls?: string[];
  }) =>
    json<{ project: Project; runId: string | null }>(
      "POST",
      "/api/projects",
      input
    ),
  starters: () => json<Starter[]>("GET", "/api/starters"),
  createFromStarter: (starterId: string, parentPath?: string) =>
    json<{ project: Project }>("POST", "/api/projects/from-starter", {
      starterId,
      ...(parentPath ? { parentPath } : {}),
    }),
  createSample: (parentPath?: string) =>
    json<{ project: Project }>(
      "POST",
      "/api/projects/sample",
      parentPath ? { parentPath } : {}
    ),
  renameProject: (pid: string, name: string) =>
    json<Project>("PATCH", p(pid), { name }),
  markProjectOpened: (pid: string) =>
    json<{ openedAt: number }>("POST", `${p(pid)}/opened`),
  duplicateProject: (pid: string) =>
    json<{ project: Project }>("POST", `${p(pid)}/duplicate`),
  trashProject: (pid: string) => json<TrashedProject>("DELETE", p(pid)),
  restoreProject: (trashId: string) =>
    json<{ project: Project }>("POST", `/api/trash/${enc(trashId)}/restore`),
  thumbnail: async (pid: string, versionId: string) =>
    (await request("GET", `${p(pid)}/thumbnail/${enc(versionId)}`)).blob(),
  clarify: (prompt: string) =>
    json<{ questions: ClarifyQuestion[] }>("POST", "/api/clarify", { prompt }),
  onboarding: () => json<{ dismissed: boolean }>("GET", "/api/onboarding"),
  dismissOnboarding: () =>
    json<{ dismissed: boolean }>("POST", "/api/onboarding/dismiss"),
  listPacks: () => json<PackSummary[]>("GET", "/api/packs"),
  packProblems: () => json<PackProblem[]>("GET", "/api/packs/problems"),
  getPack: (id: string) => json<PackDetail>("GET", `${pk(id)}`),
  checkPack: (id: string) =>
    json<DesignSystemCheckResult>("GET", `${pk(id)}/check`),
  renamePack: (id: string, name: string) =>
    json<PackSummary>("PATCH", pk(id), { name }),
  duplicatePack: (id: string, name?: string) =>
    json<PackSummary>("POST", `${pk(id)}/duplicate`, name ? { name } : {}),
  deletePack: (id: string) => json<{ ok: true }>("DELETE", pk(id)),
  exportPack: async (id: string) =>
    (await request("GET", `${pk(id)}/export`)).blob(),
  importPack: async (
    file: File,
    mode: ImportPackMode = "ask"
  ): Promise<ImportPackResult> => {
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("mode", mode);
    const res = await request("POST", "/api/packs/import", form, pickMessage);

    return (await res.json()) as ImportPackResult;
  },
  openPackEditor: (id: string) =>
    json<OpenPackEditorResult>("POST", `${pk(id)}/editor`),
  listSkills: async (): Promise<SkillCatalog> =>
    (await call<
      typeof import("../shared/actions/studio/list-skills.js").listSkillsStudio
    >(routes.listSkillsStudio, {})) as SkillCatalog,
  getDesignSystem: (pid: string, did: string) =>
    json<DesignSystemState>("GET", `${d(pid, did)}/design-system`),
  applyPack: async (
    pid: string,
    did: string,
    packId: string
  ): Promise<ApplyPackResult> => {
    const res = await request(
      "POST",
      `${d(pid, did)}/design-system/apply`,
      { packId },
      pickMessage
    );

    return (await res.json()) as ApplyPackResult;
  },
  savePack: async (
    pid: string,
    did: string,
    input: { name: string; packId?: string; asNew?: boolean; force?: boolean }
  ) => {
    const res = await request(
      "POST",
      `${d(pid, did)}/design-system/save`,
      input,
      pickMessage
    );

    return (await res.json()) as SavePackResult;
  },
  createDesignSystemDraft: (form: FormData) =>
    json<DesignSystemDraftResult>("POST", "/api/design-systems/draft", form),
  getDesignSystemDraft: (pid: string) =>
    json<DesignSystemDraftInfo>("GET", `${p(pid)}/design-system-draft`),
  createToken: async (pid: string, did: string, req: CreateTokenRequest) => {
    const res = await request(
      "POST",
      `${d(pid, did)}/design-system/tokens`,
      req,
      pickMessage
    );

    return (await res.json()) as CreateTokenResult;
  },
  previewTokens: async (pid: string, did: string, changes: TokenChange[]) => {
    const res = await request(
      "POST",
      `${d(pid, did)}/design-system/preview`,
      { changes },
      pickMessage
    );

    return (await res.json()) as TokenPreviewResult;
  },
  updateTokens: async (pid: string, did: string, changes: TokenChange[]) => {
    const res = await request(
      "POST",
      `${d(pid, did)}/design-system/tokens/update`,
      { changes },
      pickMessage
    );

    return (await res.json()) as UpdateTokensResult;
  },
  getCanvas: (pid: string) => json<CanvasSnapshot>("GET", `${p(pid)}/canvas`),
  putCanvas: (
    pid: string,
    body: {
      canvas: CanvasFile;
      baseHash: string | null;
      writer: string;
      migrate?: boolean;
    }
  ) => json<CanvasSnapshot>("PUT", `${p(pid)}/canvas`, body),
  putCanvasPresence: (pid: string, body: Omit<CanvasPresence, "at">) =>
    request("PUT", `${p(pid)}/canvas/presence`, body).then(() => undefined),
  getTweaks: (pid: string, did: string) =>
    json<TweaksState>("GET", `${d(pid, did)}/tweaks`),
  commitTweaks: async (
    pid: string,
    did: string,
    values: Record<string, TweakValue>
  ) => {
    const res = await request(
      "POST",
      `${d(pid, did)}/tweaks/commit`,
      { values },
      pickMessage
    );

    return (await res.json()) as CommitTweaksResult;
  },
  importProject: (
    path: string,
    options: { appDir?: string; skipApp?: boolean } = {}
  ) =>
    json<{ project: Project }>("POST", "/api/projects/import", {
      path,
      ...options,
    }),
  attachApp: (input: AttachAppRequest) =>
    json<{ project: Project }>("POST", "/api/projects/attach", input),
  appState: (pid: string) =>
    json<{
      app: AttachedApp;
      status: AppServerStatus | null;
      logs: AppLogLine[];
      firstVersion: FirstVersionState | null;
    }>("GET", `${p(pid)}/app`),
  appControl: (pid: string, action: "start" | "stop" | "restart") =>
    json<AppServerStatus>("POST", `${p(pid)}/app/${action}`),
  appConfig: (
    pid: string,
    input: { url?: string; env?: Record<string, string> }
  ) => json<{ app: AttachedApp }>("POST", `${p(pid)}/app/config`, input),
  appRoutes: (pid: string) =>
    json<{ routes: AppRoute[] }>("GET", `${p(pid)}/app/routes`),
  flowParams: (pid: string) =>
    json<{ params: Record<string, string> }>("GET", `${p(pid)}/flow/params`),
  buildFlow: (pid: string, input: FlowInput) =>
    json<FlowResult>("POST", `${p(pid)}/flow`, input),
  openSource: (pid: string, did: string, source: string) =>
    json<{ opened: boolean; path: string }>(
      "POST",
      `${d(pid, did)}/open-source`,
      { source }
    ),
  listWorkspaces: () => json<WorkspaceList>("GET", "/api/workspaces"),
  addWorkspace: (path: string, label?: string) =>
    json<WorkspaceFolder>("POST", "/api/workspaces", {
      path,
      ...(label ? { label } : {}),
    }),
  renameWorkspace: (id: string, label: string) =>
    json<WorkspaceFolder>("PATCH", `/api/workspaces/${enc(id)}`, { label }),
  removeWorkspace: (id: string) =>
    json<{ ok: true }>("DELETE", `/api/workspaces/${enc(id)}`),
  setDefaultFolder: (path: string) =>
    json<WorkspaceList>("PUT", "/api/workspaces/default", { path }),
  hiddenProjects: () =>
    json<{ count: number; target: string }>("GET", "/api/hidden-projects"),
  moveHiddenProjects: () =>
    json<{ moved: string[]; failed: { projectId: string; error: string }[] }>(
      "POST",
      "/api/hidden-projects/move"
    ),
  inspectFolder: (path: string, appDir?: string) =>
    json<FolderInspection>("POST", "/api/folders/inspect", {
      path,
      ...(appDir ? { appDir } : {}),
    }),
  getProject: (pid: string) => json<Project>("GET", p(pid)),
  updateSettings: (pid: string, settings: Partial<ProjectSettings>) =>
    json<Project>("PATCH", `${p(pid)}/settings`, settings),
  uploadAttachment: (pid: string, file: File) => {
    const form = new FormData();
    form.append("file", file, file.name);

    return json<Attachment>("POST", `${p(pid)}/attachments`, form);
  },
  getDesignMd: (pid: string) =>
    json<{ content: string }>("GET", `${p(pid)}/design-md`),
  putDesignMd: (pid: string, content: string) =>
    json<{ ok: boolean }>("PUT", `${p(pid)}/design-md`, { content }),
  projectFile: async (pid: string, filePath: string) => {
    const res = await request("GET", `${p(pid)}/files?path=${enc(filePath)}`);

    return res.blob();
  },
  listRuns: (pid: string) => json<RunSummary[]>("GET", `${p(pid)}/runs`),
  createDirection: (pid: string, fromVersionId: string, name: string) =>
    json<Direction>("POST", `${p(pid)}/directions`, { fromVersionId, name }),
  listVersions: (pid: string, did: string) =>
    json<Version[]>("GET", `${d(pid, did)}/versions`),
  status: (pid: string, did: string) =>
    json<WorkTreeStatus>("GET", `${d(pid, did)}/status`),
  startRun: (
    pid: string,
    did: string,
    req: RunRequest & { referenceUrls?: string[] }
  ) => json<{ runId: string }>("POST", `${d(pid, did)}/runs`, req),
  undo: (pid: string, did: string) =>
    json<Version>("POST", `${d(pid, did)}/undo`),
  editHistory: (pid: string, did: string) =>
    json<EditHistoryState>("GET", `${p(pid)}/edit-history?did=${enc(did)}`),
  editHistoryStep: async (pid: string, did: string, kind: "undo" | "redo") => {
    const res = await request(
      "POST",
      `${d(pid, did)}/edit-history/${kind}`,
      undefined,
      pickMessage
    );

    return (await res.json()) as { state: EditHistoryState; version: Version };
  },
  editSession: (pid: string, did: string, base?: string) =>
    json<EditSessionState>(
      "GET",
      `${d(pid, did)}/edit-session${base ? `?base=${enc(base)}` : ""}`
    ),
  endEditSession: async (
    pid: string,
    did: string,
    action: "save" | "discard",
    baseVersionId: string
  ) => {
    const res = await request(
      "POST",
      `${d(pid, did)}/edit-session/${action}`,
      { baseVersionId },
      pickMessage
    );

    return (await res.json()) as EditSessionEnd;
  },
  elementClasses: (
    pid: string,
    did: string,
    loc: { file: string; line: number; col: number },
    variant = ""
  ) =>
    json<{
      tailwind: TailwindOutcome | null;
      element: ElementSourceInfo | null;
      variants?: import("../shared/variants").VariantSupport;
    }>(
      "GET",
      `${d(pid, did)}/classes?file=${enc(loc.file)}&line=${loc.line}&col=${loc.col}${variant ? `&variant=${enc(variant)}` : ""}`
    ),
  textSource: (
    pid: string,
    did: string,
    source: SourceLoc,
    hints: TextSourceHints
  ) =>
    json<TextSourceAnswer>("POST", `${d(pid, did)}/text-source`, {
      source,
      hints,
    }),
  elementSource: (
    pid: string,
    did: string,
    loc: { file: string; line: number; col: number }
  ) =>
    json<{ file: string; line: number; code: string | null }>(
      "GET",
      `${d(pid, did)}/source?file=${enc(loc.file)}&line=${loc.line}&col=${loc.col}`
    ),
  restore: (pid: string, did: string, versionId: string) =>
    json<Version>("POST", `${d(pid, did)}/restore`, { versionId }),
  keep: (pid: string, did: string) =>
    json<Version>("POST", `${d(pid, did)}/keep`),
  discard: (pid: string, did: string) =>
    json<WorkTreeStatus>("POST", `${d(pid, did)}/discard`),
  directionPreview: (pid: string, did: string) =>
    json<{ url: string }>("GET", `${d(pid, did)}/preview`),
  directEdit: (pid: string, did: string, req: DirectEditRequest) =>
    timedEdit(
      pid,
      did,
      editKind(req),
      1,
      async () =>
        (await (
          await request("POST", `${d(pid, did)}/direct-edit`, req, pickMessage)
        ).json()) as DirectEditResult
    ),
  directEditBatch: (pid: string, did: string, batch: DirectEditBatch) =>
    timedEdit(
      pid,
      did,
      "batch",
      batch.edits.length,
      async () =>
        (await (
          await request(
            "POST",
            `${d(pid, did)}/direct-edit`,
            batch,
            pickMessage
          )
        ).json()) as DirectEditBatchResult
    ),
  structureEdit: (pid: string, did: string, req: StructureEditRequest) =>
    timedEdit(
      pid,
      did,
      req.op,
      req.targets.length,
      async () =>
        (await (
          await request("POST", `${d(pid, did)}/direct-edit`, req, pickMessage)
        ).json()) as StructureEditResult
    ),
  workTreeFiles: (pid: string, did: string) =>
    sharedTree(`${d(pid, did)}/tree`),
  searchText: async (
    pid: string,
    did: string,
    q: import("../shared/text-search").TextSearchQuery
  ) => {
    const params = new URLSearchParams({
      caseSensitive: String(q.caseSensitive),
      query: q.query,
      regex: String(q.regex),
      wholeWord: String(q.wholeWord),
      ...(q.glob ? { glob: q.glob } : {}),
    });

    return (await (
      await request(
        "GET",
        `${d(pid, did)}/search-text?${params.toString()}`,
        undefined,
        pickMessage
      )
    ).json()) as import("../shared/text-search").TextSearchResult;
  },
  updateText: async (
    pid: string,
    did: string,
    req: import("../shared/text-search").TextUpdateRequest
  ) =>
    (await (
      await request(
        "POST",
        `${d(pid, did)}/update-text`,
        {
          caseSensitive: req.caseSensitive,
          query: req.query,
          regex: req.regex,
          replace: req.replace,
          wholeWord: req.wholeWord,
          ...(req.glob ? { glob: req.glob } : {}),
          ...(req.ids ? { ids: req.ids } : {}),
        },
        pickMessage
      )
    ).json()) as import("../shared/text-search").TextUpdateResult,
  importPage: async (
    pid: string,
    did: string,
    req: Omit<PageImportRequest, "name">
  ) =>
    (await (
      await request(
        "POST",
        `${d(pid, did)}/import-page`,
        {
          url: req.url,
          width: req.width,
          ...(req.selector ? { selector: req.selector } : {}),
        },
        pickMessage
      )
    ).json()) as PageImportResult,
  renderCheck: (pid: string, did: string) =>
    json<RenderCheckResult[]>("POST", `${d(pid, did)}/check`),
  versionPreview: (pid: string, vid: string) =>
    json<{ url: string }>("GET", `${p(pid)}/versions/${enc(vid)}/preview`),
  exportVersion: async (pid: string, vid: string) => {
    const res = await request("GET", `${p(pid)}/versions/${enc(vid)}/export`);

    return res.blob();
  },
  getRun: (runId: string) =>
    json<{ summary: RunSummary; events: StudioEvent[] }>(
      "GET",
      `/api/runs/${enc(runId)}`
    ),
  cancelRun: (runId: string) =>
    json<{ ok: boolean }>("POST", `/api/runs/${enc(runId)}/cancel`),
  setQueue: (runId: string, items: QueuedMessage[]) =>
    json<{ ok: boolean }>("PUT", `/api/runs/${enc(runId)}/queue`, { items }),
  steerRun: (runId: string, text: string) =>
    json<{ ok: boolean }>("POST", `/api/runs/${enc(runId)}/steer`, { text }),
  answerPermission: (
    runId: string,
    requestId: string,
    decision: PermissionDecision
  ) =>
    json<{ ok: boolean }>(
      "POST",
      `/api/runs/${enc(runId)}/permissions/${enc(requestId)}`,
      decision
    ),
  postTelemetry: (sample: TelemetrySample) =>
    json<{ ok: boolean }>("POST", "/api/telemetry", sample),
  getTelemetry: (pid: string) =>
    json<TelemetrySample[]>("GET", `/api/telemetry?projectId=${enc(pid)}`),
  review: (pid: string, did: string, body: ReviewRequest) =>
    json<ReviewResult>("POST", `${d(pid, did)}/review`, body),
  reviewFix: (pid: string, did: string, findingIds: string[]) =>
    json<ReviewFixResult>("POST", `${d(pid, did)}/review/fix`, {
      findingIds,
      allowShared: true,
    }),
  appFix: (pid: string, kind: DoctorCauseKind) =>
    json<AppFixResult>("POST", `${p(pid)}/app/doctor/fix`, { kind }),
  listIcons: (pid: string, did: string, q: IconListQuery) =>
    json<IconList>(
      "GET",
      `${d(pid, did)}/icons?${new URLSearchParams({
        query: q.query,
        limit: String(q.limit ?? 48),
        ...(q.library ? { library: q.library } : {}),
      }).toString()}`
    ),
  insertIcon: (pid: string, did: string, body: IconInsertBody) =>
    timedEdit(pid, did, "icon", 1, () =>
      json<IconInsertReply>("POST", `${d(pid, did)}/icons/insert`, body)
    ),
  getFill: (pid: string, did: string, source: SourceLoc) =>
    json<FillInfo>(
      "GET",
      `${d(pid, did)}/fill?${new URLSearchParams({
        file: source.file,
        line: String(source.line),
        col: String(source.col),
      }).toString()}`
    ),
  setFill: (pid: string, did: string, body: FillSetBody) =>
    timedEdit(pid, did, "fill", 1, () =>
      json<FillSetReply>("POST", `${d(pid, did)}/fill`, body)
    ),
  getSpacing: (
    pid: string,
    did: string,
    source: SourceLoc,
    computed: SpacingComputed
  ) =>
    json<SpacingBox>(
      "GET",
      `${d(pid, did)}/spacing?${new URLSearchParams({
        file: source.file,
        line: String(source.line),
        col: String(source.col),
        gap: computed.gap,
        margin: computed.margin,
        padding: computed.padding,
      }).toString()}`
    ),
  setSpacing: (pid: string, did: string, body: SpacingSetBody) =>
    timedEdit(pid, did, "spacing", 1, () =>
      json<SpacingSetResult>("POST", `${d(pid, did)}/spacing`, body)
    ),
  listMotion: (pid: string, did: string, source: SourceLoc) =>
    json<MotionInfo>(
      "GET",
      `${d(pid, did)}/motion?${new URLSearchParams({
        file: source.file,
        line: String(source.line),
        col: String(source.col),
      }).toString()}`
    ),
  setMotion: (pid: string, did: string, body: MotionSetBody) =>
    timedEdit(pid, did, "motion", 1, () =>
      json<MotionSetResult>("POST", `${d(pid, did)}/motion`, body)
    ),
  listTextStyles: (pid: string, did: string) =>
    json<TextStyleList>("GET", `${d(pid, did)}/text-styles?limit=100`),
  applyTextStyle: (pid: string, did: string, body: TextStyleApplyBody) =>
    timedEdit(pid, did, "text-style", 1, () =>
      json<TextStyleApplyResult>(
        "POST",
        `${d(pid, did)}/text-styles/apply`,
        body
      )
    ),
  createTextStyle: (pid: string, did: string, body: TextStyleCreateBody) =>
    timedEdit(pid, did, "text-style", 1, () =>
      json<TextStyleCreateResult>(
        "POST",
        `${d(pid, did)}/text-styles/create`,
        body
      )
    ),
  detachTextStyle: (pid: string, did: string, body: TextStyleDetachBody) =>
    timedEdit(pid, did, "text-style", 1, () =>
      json<{ file: string; versionId: string }>(
        "POST",
        `${d(pid, did)}/text-styles/detach`,
        body
      )
    ),
};

function editKind(req: DirectEditRequest): string {
  if (req.move) {
    return "move";
  }

  if (req.insert) {
    return "insert";
  }

  if (req.text !== undefined) {
    return "text";
  }

  if (req.name !== undefined) {
    return "name";
  }

  return "style";
}

async function timedEdit<T>(
  pid: string,
  did: string,
  kind: string,
  count: number,
  commit: () => Promise<T>
): Promise<T> {
  const started = performance.now();
  const result = await commit();
  sendTelemetry({
    kind: "edit.commit",
    projectId: pid,
    directionId: did,
    ms: Math.round(performance.now() - started),
    detail: { kind, count },
  });

  return result;
}

export function sendTelemetry(sample: Omit<TelemetrySample, "ts">): void {
  api.postTelemetry({ ...sample, ts: Date.now() }).catch(() => undefined);
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function replaceStyle(
  pid: string,
  did: string,
  req: StyleReplaceRequest
): Promise<StyleReplaceResult> {
  return timedEdit(
    pid,
    did,
    "replace-style",
    req.matches.length,
    async () =>
      (await (
        await request(
          "POST",
          `${d(pid, did)}/direct-edit`,
          { replaceStyle: req },
          pickMessage
        )
      ).json()) as StyleReplaceResult
  );
}

export const rulesApi = {
  get: (pid: string, did: string) =>
    json<DesignRulesState>("GET", `${d(pid, did)}/rules`),
  save: (pid: string, did: string, text: string) =>
    json<{ state: DesignRulesState; versionId: string | null }>(
      "PUT",
      `${d(pid, did)}/rules`,
      { text }
    ),
  test: (
    pid: string,
    did: string,
    text: string,
    frame?: { frame: string; path?: string; width: number; height: number }
  ) =>
    json<DesignRulesTestResult>("POST", `${d(pid, did)}/rules/test`, {
      text,
      ...frame,
    }),
};

export function arrange(
  projectId: string,
  directionId: string,
  req: import("../shared/arrange").ArrangeRequest
): Promise<import("../shared/arrange").ArrangeResult> {
  return timedEdit(
    projectId,
    directionId,
    "arrange",
    req.targets.length,
    async () =>
      (await (
        await request(
          "POST",
          `${d(projectId, directionId)}/direct-edit`,
          { arrange: req },
          pickMessage
        )
      ).json()) as import("../shared/arrange").ArrangeResult
  );
}
