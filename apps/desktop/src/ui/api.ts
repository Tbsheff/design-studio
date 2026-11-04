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
  EditSessionState,
  Direction,
  Project,
  ProjectKind,
  ProjectSettings,
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
} from "@design-studio/contracts";
import type {
  AppFixResult,
  DoctorCauseKind,
} from "@design-studio/contracts/app-doctor";
import type { CanvasFile } from "@design-studio/contracts/canvas-file";
import type {
  WorkspaceFolder,
  WorkspaceList,
} from "@design-studio/contracts/folders";
import type { InsertTarget } from "@design-studio/contracts/insert";
import type {
  StyleReplaceRequest,
  StyleReplaceResult,
} from "@design-studio/contracts/style-search";

import type {
  BlendMode,
  BlendProperty,
  FillBlend,
  FillInfo,
  FillSpec,
  FillType,
  RadialForm,
} from "../shared/fill";
import type { IconList, IconPosition, IconSource } from "../shared/icons";
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
  TextStyleApplyResult,
  TextStyleCreateResult,
  TextStyleList,
} from "../shared/text-styles";

export interface CanvasSnapshot {
  directionId: string;
  canvas: CanvasFile | null;
  hash: string | null;
}

import { routes as projectsRoutes } from "@design-studio/actions/project/routes";
import { routes } from "@design-studio/actions/studio/routes";
import { routes as versionsRoutes } from "@design-studio/actions/version/routes";
import type {
  DesignRulesState,
  DesignRulesTestResult,
} from "@design-studio/contracts/design-rules";
import type {
  ReviewFixResult,
  ReviewRequest,
  ReviewResult,
} from "@design-studio/contracts/review";

import type { FlowInput, FlowResult } from "../shared/route-flow";
import type {
  CommitTweaksResult,
  TweaksState,
  TweakValue,
} from "../shared/tweaks";
import {
  endEditSession,
  restoreVersion,
  stepEditHistory,
} from "./features/versions-layers-tokens/versions-api";
import { call, pickMessage, request } from "./platform/http";
import type { JsonBody } from "./platform/http";
import { prefetch, readShared } from "./platform/query";

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

const sendPresence = async (
  pid: string,
  body: Omit<CanvasPresence, "at">
): Promise<void> => {
  await request(
    "PUT",
    `/api/projects/${encodeURIComponent(pid)}/canvas/presence`,
    body
  );
};

export function json<T>(
  method: string,
  path: string,
  body?: JsonBody
): Promise<T> {
  const load = async (): Promise<T> => {
    const res = await request(method, path, body ?? null);

    return (await res.json()) as T;
  };

  if (method === "GET") {
    return readShared(`GET ${path}`, load);
  }

  return load();
}

export async function getBlob(path: string): Promise<Blob> {
  const res = await request("GET", path);

  return res.blob();
}

const enc = encodeURIComponent;

const p = (pid: string) => `/api/projects/${enc(pid)}`;

const d = (pid: string, did: string) => `${p(pid)}/d/${enc(did)}`;

const RUNS_PAGE = "/runs?cursor=null&limit=200";

const warmPath = (path: string): void => {
  prefetch(`GET ${path}`, async () => {
    const res = await request("GET", path);

    return (await res.json()) as unknown;
  });
};

export function warmProject(pid: string, directionId: string | null): void {
  warmPath(p(pid));
  warmPath(`${p(pid)}${RUNS_PAGE}`);
  warmPath(`${p(pid)}/canvas`);

  if (directionId) {
    warmPath(`${d(pid, directionId)}/preview`);
  }
}

const BASE64_CHUNK = 32_768;

const fileToBase64 = async (file: File): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";

  for (let at = 0; at < bytes.length; at += BASE64_CHUNK) {
    binary += String.fromCodePoint(...bytes.subarray(at, at + BASE64_CHUNK));
  }

  return btoa(binary);
};

const base64ToBlob = (data: string, mimeType: string): Blob => {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0);

  return new Blob([bytes], { type: mimeType });
};

interface ProjectWire {
  readonly directions: readonly unknown[];
  readonly id: string;
}

interface SearchWire {
  readonly projects: readonly unknown[];
  readonly query: string;
  readonly routes: readonly unknown[];
}

interface SearchHitWire {
  readonly kind: "project" | "route";
}

const PROJECT_PAGE_LIMIT = 200;

interface AttachmentWire {
  readonly id: string;
  readonly mime: string;
  readonly name: string;
  readonly path: unknown;
}

const isProject = (wire: ProjectWire): wire is Project =>
  typeof wire.id === "string" && Array.isArray(wire.directions);

const isSearchResult = (
  wire: SearchWire
): wire is import("../shared/project-search").ProjectSearchResult =>
  Array.isArray(wire.projects) && Array.isArray(wire.routes);

const isAttachment = (wire: AttachmentWire): wire is Attachment =>
  typeof wire.id === "string" && typeof wire.name === "string";

const toProject = (wire: ProjectWire): Project => {
  if (!isProject(wire)) {
    throw new Error("The project response is not valid.");
  }

  return wire;
};

const toSearchResult = (
  query: string,
  items: readonly SearchHitWire[]
): import("../shared/project-search").ProjectSearchResult => {
  const wire: SearchWire = {
    projects: items.filter((item) => item.kind === "project"),
    query,
    routes: items.filter((item) => item.kind === "route"),
  };

  if (!isSearchResult(wire)) {
    throw new Error("The project search response is not valid.");
  }

  return wire;
};

const toAttachment = (wire: AttachmentWire): Attachment => {
  if (!isAttachment(wire)) {
    throw new Error("The attachment response is not valid.");
  }

  return wire;
};

export const api = {
  addWorkspace: (path: string, label?: string) =>
    json<WorkspaceFolder>("POST", "/api/workspaces", {
      path,
      ...(label ? { label } : {}),
    }),
  answerPermission: (
    pid: string,
    runId: string,
    requestId: string,
    decision: PermissionDecision
  ) =>
    json<{ ok: boolean }>(
      "POST",
      `${p(pid)}/runs/${enc(runId)}/permissions/${enc(requestId)}`,
      decision
    ),
  appConfig: (
    pid: string,
    input: { url?: string; env?: Record<string, string> }
  ) => json<{ app: AttachedApp }>("POST", `${p(pid)}/app/config`, input),
  appControl: (pid: string, action: "start" | "stop" | "restart") =>
    json<AppServerStatus>("POST", `${p(pid)}/app/${action}`),
  appFix: (pid: string, kind: DoctorCauseKind) =>
    json<AppFixResult>("POST", `${p(pid)}/app/doctor/fix`, { kind }),
  appRoutes: (pid: string) =>
    json<{ routes: AppRoute[] }>("GET", `${p(pid)}/app/routes`),
  appState: (pid: string) =>
    json<{
      app: AttachedApp;
      status: AppServerStatus | null;
      logs: AppLogLine[];
      firstVersion: FirstVersionState | null;
    }>("GET", `${p(pid)}/app`),
  applyTextStyle: (pid: string, did: string, body: TextStyleApplyBody) =>
    timedEdit(pid, did, "text-style", 1, () =>
      json<TextStyleApplyResult>(
        "POST",
        `${d(pid, did)}/text-styles/apply`,
        body
      )
    ),
  attachApp: (input: AttachAppRequest) =>
    json<{ project: Project }>("POST", "/api/projects/attach", input),
  buildFlow: (pid: string, input: FlowInput) =>
    json<FlowResult>("POST", `${p(pid)}/flow`, input),
  cancelRun: (pid: string, runId: string) =>
    json<{ ok: boolean }>("POST", `${p(pid)}/runs/${enc(runId)}/cancel`),
  clarify: (prompt: string) =>
    json<{ questions: ClarifyQuestion[] }>("POST", "/api/clarify", { prompt }),
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
  createDirection: (pid: string, fromVersionId: string, name: string) =>
    json<Direction>("POST", `${p(pid)}/directions`, { fromVersionId, name }),
  createFromStarter: (starterId: string, parentPath?: string) =>
    json<{ project: Project }>("POST", "/api/projects/from-starter", {
      starterId,
      ...(parentPath ? { parentPath } : {}),
    }),
  createProject: async (input: {
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
  }) => {
    const created = await call(projectsRoutes.createProject, input);

    return { project: toProject(created.project), runId: created.runId };
  },
  createSample: (parentPath?: string) =>
    json<{ project: Project }>(
      "POST",
      "/api/projects/sample",
      parentPath ? { parentPath } : {}
    ),
  createTextStyle: (pid: string, did: string, body: TextStyleCreateBody) =>
    timedEdit(pid, did, "text-style", 1, () =>
      json<TextStyleCreateResult>(
        "POST",
        `${d(pid, did)}/text-styles/create`,
        body
      )
    ),
  createToken: async (pid: string, did: string, req: CreateTokenRequest) => {
    const res = await request(
      "POST",
      `${d(pid, did)}/design-system/tokens`,
      req,
      pickMessage
    );

    return (await res.json()) as CreateTokenResult;
  },
  detachTextStyle: (pid: string, did: string, body: TextStyleDetachBody) =>
    timedEdit(pid, did, "text-style", 1, () =>
      json<{ file: string; versionId: string }>(
        "POST",
        `${d(pid, did)}/text-styles/detach`,
        body
      )
    ),
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
  directionPreview: (pid: string, did: string) =>
    json<{ url: string }>("GET", `${d(pid, did)}/preview`),
  discard: (pid: string, did: string) =>
    json<WorkTreeStatus>("POST", `${d(pid, did)}/discard`),
  dismissOnboarding: () =>
    json<{ dismissed: boolean }>("POST", "/api/onboarding/dismiss"),
  duplicateProject: (pid: string) =>
    json<{ project: Project }>("POST", `${p(pid)}/duplicate`),
  editHistory: (pid: string, did: string): Promise<EditHistoryState> =>
    call(versionsRoutes.listHistoryVersion, {
      limit: 1,
      directionId: did,
      projectId: pid,
    }),
  editHistoryStep: (pid: string, did: string, kind: "undo" | "redo") =>
    stepEditHistory(pid, did, kind),
  editSession: (pid: string, did: string, base?: string) =>
    json<EditSessionState>(
      "GET",
      `${d(pid, did)}/edit-session${base ? `?base=${enc(base)}` : ""}`
    ),
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
  elementSource: (
    pid: string,
    did: string,
    loc: { file: string; line: number; col: number }
  ) =>
    json<{ file: string; line: number; code: string | null }>(
      "GET",
      `${d(pid, did)}/source?file=${enc(loc.file)}&line=${loc.line}&col=${loc.col}`
    ),
  endEditSession: (
    pid: string,
    did: string,
    action: "save" | "discard",
    baseVersionId: string
  ) => endEditSession(pid, did, action, baseVersionId),
  exportVersion: async (pid: string, vid: string) => {
    const res = await request("GET", `${p(pid)}/versions/${enc(vid)}/export`);

    return res.blob();
  },
  flowParams: (pid: string) =>
    json<{ params: Record<string, string> }>("GET", `${p(pid)}/flow/params`),
  getCanvas: (pid: string) => json<CanvasSnapshot>("GET", `${p(pid)}/canvas`),
  getDesignMd: (pid: string) =>
    call(projectsRoutes.getDesignMdProject, { projectId: pid }),
  getDesignSystem: (pid: string, did: string) =>
    json<DesignSystemState>("GET", `${d(pid, did)}/design-system`),
  getFill: (pid: string, did: string, source: SourceLoc) =>
    json<FillInfo>(
      "GET",
      `${d(pid, did)}/fill?${new URLSearchParams({
        file: source.file,
        line: String(source.line),
        col: String(source.col),
      }).toString()}`
    ),
  getProject: async (pid: string) =>
    toProject(await call(projectsRoutes.getProject, { projectId: pid })),
  getRun: (pid: string, runId: string) =>
    json<{ summary: RunSummary; events: StudioEvent[] }>(
      "GET",
      `${p(pid)}/runs/${enc(runId)}`
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
  getTelemetry: (pid: string) =>
    json<TelemetrySample[]>("GET", `/api/telemetry?projectId=${enc(pid)}`),
  getTweaks: (pid: string, did: string) =>
    json<TweaksState>("GET", `${d(pid, did)}/tweaks`),
  hiddenProjects: () => call(projectsRoutes.getHiddenProject, {}),
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
  importProject: async (
    path: string,
    options: { appDir?: string; skipApp?: boolean } = {}
  ) => {
    const imported = await call(projectsRoutes.importProject, {
      path,
      ...options,
    });

    return { project: toProject(imported.project) };
  },
  insertIcon: (pid: string, did: string, body: IconInsertBody) =>
    timedEdit(pid, did, "icon", 1, () =>
      json<IconInsertReply>("POST", `${d(pid, did)}/icons/insert`, body)
    ),
  inspectFolder: (path: string, appDir?: string) =>
    json<FolderInspection>("POST", "/api/folders/inspect", {
      path,
      ...(appDir ? { appDir } : {}),
    }),
  keep: (pid: string, did: string) =>
    json<Version>("POST", `${d(pid, did)}/keep`),
  listIcons: (pid: string, did: string, q: IconListQuery) =>
    json<IconList>(
      "GET",
      `${d(pid, did)}/icons?${new URLSearchParams({
        query: q.query,
        limit: String(q.limit ?? 48),
        ...(q.library ? { library: q.library } : {}),
      }).toString()}`
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
  listProjects: async (): Promise<Project[]> => {
    const all: ProjectWire[] = [];
    let cursor: string | null = null;

    do {
      const page: {
        readonly items: readonly ProjectWire[];
        readonly next: string | null;
      } = await call(projectsRoutes.listProject, {
        cursor,
        limit: PROJECT_PAGE_LIMIT,
      });

      all.push(...page.items);
      cursor = page.next;
    } while (cursor !== null);

    return all.map((item) => toProject(item));
  },
  listRuns: async (pid: string) => {
    const page = await json<{ items: RunSummary[] }>(
      "GET",
      `${p(pid)}${RUNS_PAGE}`
    );

    return page.items;
  },
  listSkills: (): Promise<SkillCatalog> => call(routes.listSkillsStudio, {}),
  listTextStyles: (pid: string, did: string) =>
    json<TextStyleList>("GET", `${d(pid, did)}/text-styles?limit=100`),
  listVersions: async (pid: string, did: string) => {
    const list = await call(versionsRoutes.listVersion, {
      directionId: did,
      projectId: pid,
    });

    const items: Version[] = list.items;

    return items;
  },
  listWorkspaces: () => json<WorkspaceList>("GET", "/api/workspaces"),
  markProjectOpened: (pid: string) =>
    json<{ openedAt: number }>("POST", `${p(pid)}/opened`),
  moveHiddenProjects: () => call(projectsRoutes.moveHiddenProject, {}),
  onboarding: () => json<{ dismissed: boolean }>("GET", "/api/onboarding"),
  openSource: (pid: string, did: string, source: string) =>
    json<{ opened: boolean; path: string }>(
      "POST",
      `${d(pid, did)}/open-source`,
      { source }
    ),
  postTelemetry: (sample: TelemetrySample) =>
    json<{ ok: boolean }>("POST", "/api/telemetry", sample),
  previewTokens: async (
    pid: string,
    did: string,
    changes: TokenChange[]
  ): Promise<TokenPreviewResult> => {
    const { routes: directEditRoutes } =
      await import("@design-studio/actions/direct-edit/routes");

    return call(directEditRoutes.inspectTokensDirectEdit, {
      changes: JSON.stringify(changes),
      directionId: did,
      projectId: pid,
    });
  },
  projectFile: async (pid: string, filePath: string) => {
    const file = await call(projectsRoutes.getFileProject, {
      path: filePath,
      projectId: pid,
    });

    return base64ToBlob(file.data, file.mimeType);
  },
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
    sendPresence(pid, body),
  putDesignMd: (pid: string, content: string) =>
    call(projectsRoutes.setDesignMdProject, { content, projectId: pid }),
  removeWorkspace: (id: string) =>
    json<{ ok: true }>("DELETE", `/api/workspaces/${enc(id)}`),
  renameProject: (pid: string, name: string) =>
    json<Project>("PATCH", p(pid), { name }),
  renameWorkspace: (id: string, label: string) =>
    json<WorkspaceFolder>("PATCH", `/api/workspaces/${enc(id)}`, { label }),
  renderCheck: async (pid: string, did: string) =>
    (
      await json<{ results: RenderCheckResult[] }>(
        "POST",
        `${d(pid, did)}/check`
      )
    ).results,
  restore: (pid: string, did: string, versionId: string) =>
    restoreVersion(pid, did, versionId),
  restoreProject: (trashId: string) =>
    json<{ project: Project }>("POST", `/api/trash/${enc(trashId)}/restore`),
  review: (pid: string, did: string, body: ReviewRequest) =>
    json<ReviewResult>("POST", `${d(pid, did)}/review`, body),
  reviewFix: (pid: string, did: string, findingIds: string[]) =>
    json<ReviewFixResult>("POST", `${d(pid, did)}/review/fix`, {
      findingIds,
      allowShared: true,
    }),
  searchProjects: async (q: string, project: string | null, limit = 20) => {
    const found = await call(projectsRoutes.searchProject, {
      cursor: null,
      limit,
      projectId: project,
      query: q,
    });

    return toSearchResult(q, found.items);
  },
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
  setDefaultFolder: (path: string) =>
    json<WorkspaceList>("PUT", "/api/workspaces/default", { path }),
  setFill: (pid: string, did: string, body: FillSetBody) =>
    timedEdit(pid, did, "fill", 1, () =>
      json<FillSetReply>("POST", `${d(pid, did)}/fill`, body)
    ),
  setMotion: (pid: string, did: string, body: MotionSetBody) =>
    timedEdit(pid, did, "motion", 1, () =>
      json<MotionSetResult>("POST", `${d(pid, did)}/motion`, body)
    ),
  setQueue: (pid: string, runId: string, items: QueuedMessage[]) =>
    json<{ ok: boolean }>("PUT", `${p(pid)}/runs/${enc(runId)}/queue`, {
      items,
    }),
  setSpacing: (pid: string, did: string, body: SpacingSetBody) =>
    timedEdit(pid, did, "spacing", 1, () =>
      json<SpacingSetResult>("POST", `${d(pid, did)}/spacing`, body)
    ),
  startRun: (
    pid: string,
    did: string,
    req: RunRequest & { referenceUrls?: string[] }
  ) => json<{ runId: string }>("POST", `${d(pid, did)}/runs`, req),
  starters: () => json<Starter[]>("GET", "/api/starters"),
  status: (pid: string, did: string) =>
    json<WorkTreeStatus>("GET", `${d(pid, did)}/status`),
  steerRun: (pid: string, runId: string, text: string) =>
    json<{ ok: boolean }>("POST", `${p(pid)}/runs/${enc(runId)}/steer`, {
      text,
    }),
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
  thumbnail: async (pid: string, versionId: string) =>
    (await request("GET", `${p(pid)}/thumbnail/${enc(versionId)}`)).blob(),
  trashProject: (pid: string) => json<TrashedProject>("DELETE", p(pid)),
  undo: (pid: string, did: string) =>
    json<Version>("POST", `${d(pid, did)}/undo`),
  updateSettings: async (pid: string, settings: Partial<ProjectSettings>) =>
    toProject(
      await call(projectsRoutes.updateProject, {
        ...settings,
        projectId: pid,
      })
    ),
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
  updateTokens: async (pid: string, did: string, changes: TokenChange[]) => {
    const res = await request(
      "POST",
      `${d(pid, did)}/design-system/tokens/update`,
      { changes },
      pickMessage
    );

    return (await res.json()) as UpdateTokensResult;
  },
  uploadAttachment: async (pid: string, file: File) =>
    toAttachment(
      await call(projectsRoutes.createAttachmentProject, {
        data: await fileToBase64(file),
        mime: file.type,
        name: file.name,
        projectId: pid,
      })
    ),
  versionPreview: (pid: string, vid: string) =>
    json<{ url: string }>("GET", `${p(pid)}/versions/${enc(vid)}/preview`),
  workTreeFiles: (pid: string, did: string) =>
    json<{ files: string[] }>("GET", `${d(pid, did)}/tree`),
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
    detail: { count, kind },
    directionId: did,
    kind: "edit.commit",
    ms: Math.round(performance.now() - started),
    projectId: pid,
  });

  return result;
}

export function sendTelemetry(sample: Omit<TelemetrySample, "ts">): void {
  api.postTelemetry({ ...sample, ts: Date.now() }).catch(() => {});
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
