import type { PermissionDecision, QueuedMessage } from '../shared/contracts';
import {
  STUDIO_TOKEN_HEADER,
  type Attachment,
  type ClarifyQuestion,
  type Starter,
  type TrashedProject,
  type DirectEditRequest,
  type CreateTokenRequest,
  type CreateTokenResult,
  type DesignSystemState,
  type DirectEditBatch,
  type DirectEditBatchResult,
  type DirectEditResult,
  type EditHistoryState,
  type Direction,
  type Project,
  type PackSummary,
  type ProjectKind,
  type ProjectSettings,
  type ApplyPackResult,
  type SavePackResult,
  type DesignSystemDraftInfo,
  type DesignSystemCheckResult,
  type ImportPackMode,
  type ImportPackResult,
  type OpenPackEditorResult,
  type PackDetail,
  type PackProblem,
  type DesignSystemDraftResult,
  type SkillCatalog,
  type RenderCheckResult,
  type RunLevel,
  type RunRequest,
  type RunSummary,
  type StudioEvent,
  type TokenChange,
  type TokenPreviewResult,
  type UpdateTokensResult,
  type TelemetrySample,
  type Version,
  type WorkTreeStatus,
} from '../shared/contracts';
import type { WorkspaceFolder, WorkspaceList } from '../shared/folders';
import type { CommitTweaksResult, TweaksState, TweakValue } from '../shared/tweaks';
import { getSession } from './session';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public data?: unknown,
  ) {
    super(message);
  }
}

type ErrorPick = (data: { error?: string; message?: string }) => string | undefined;

const pickError: ErrorPick = (data) => data.error ?? data.message;
const pickMessage: ErrorPick = (data) => data.message ?? data.error;

async function request(method: string, path: string, body?: unknown, pick: ErrorPick = pickError): Promise<Response> {
  const headers: Record<string, string> = { [STUDIO_TOKEN_HEADER]: getSession().token };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(path, { method, headers, body: payload });
  if (!res.ok) {
    let message = `${method} ${path} failed: ${res.status}`;
    let code: string | undefined;
    let data: unknown;
    try {
      const parsed = (await res.json()) as { error?: string; message?: string };
      data = parsed;
      message = pick(parsed) ?? message;
      code = parsed.error;
    } catch {
      message = `${message} ${res.statusText}`;
    }
    throw new ApiError(res.status, message, code, data);
  }
  return res;
}

export async function json<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await request(method, path, body);
  return (await res.json()) as T;
}

const p = (pid: string) => `/api/projects/${encodeURIComponent(pid)}`;
const d = (pid: string, did: string) => `${p(pid)}/d/${encodeURIComponent(did)}`;
const pk = (id: string) => `/api/packs/${encodeURIComponent(id)}`;

export const api = {
  listProjects: () => json<Project[]>('GET', '/api/projects'),
  createProject: (input: { name?: string; prompt: string; kind: ProjectKind; settings?: Partial<ProjectSettings>; designMd?: string; packId?: string; level?: RunLevel; startRun?: boolean; parentPath?: string; referenceUrls?: string[] }) =>
    json<{ project: Project; runId: string | null }>('POST', '/api/projects', input),
  starters: () => json<Starter[]>('GET', '/api/starters'),
  createFromStarter: (starterId: string, parentPath?: string) => json<{ project: Project }>('POST', '/api/projects/from-starter', { starterId, ...(parentPath ? { parentPath } : {}) }),
  createSample: (parentPath?: string) => json<{ project: Project }>('POST', '/api/projects/sample', parentPath ? { parentPath } : {}),
  renameProject: (pid: string, name: string) => json<Project>('PATCH', p(pid), { name }),
  duplicateProject: (pid: string) => json<{ project: Project }>('POST', `${p(pid)}/duplicate`),
  trashProject: (pid: string) => json<TrashedProject>('DELETE', p(pid)),
  restoreProject: (trashId: string) => json<{ project: Project }>('POST', `/api/trash/${encodeURIComponent(trashId)}/restore`),
  thumbnail: async (pid: string, versionId: string) => (await request('GET', `${p(pid)}/thumbnail/${encodeURIComponent(versionId)}`)).blob(),
  clarify: (prompt: string) => json<{ questions: ClarifyQuestion[] }>('POST', '/api/clarify', { prompt }),
  onboarding: () => json<{ dismissed: boolean }>('GET', '/api/onboarding'),
  dismissOnboarding: () => json<{ dismissed: boolean }>('POST', '/api/onboarding/dismiss'),
  listPacks: () => json<PackSummary[]>('GET', '/api/packs'),
  packProblems: () => json<PackProblem[]>('GET', '/api/packs/problems'),
  getPack: (id: string) => json<PackDetail>('GET', `${pk(id)}`),
  checkPack: (id: string) => json<DesignSystemCheckResult>('GET', `${pk(id)}/check`),
  renamePack: (id: string, name: string) => json<PackSummary>('PATCH', pk(id), { name }),
  duplicatePack: (id: string, name?: string) => json<PackSummary>('POST', `${pk(id)}/duplicate`, name ? { name } : {}),
  deletePack: (id: string) => json<{ ok: true }>('DELETE', pk(id)),
  exportPack: async (id: string) => (await request('GET', `${pk(id)}/export`)).blob(),
  importPack: async (file: File, mode: ImportPackMode = 'ask'): Promise<ImportPackResult> => {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('mode', mode);
    const res = await request('POST', '/api/packs/import', form, pickMessage);
    return (await res.json()) as ImportPackResult;
  },
  openPackEditor: (id: string) => json<OpenPackEditorResult>('POST', `${pk(id)}/editor`),
  listSkills: () => json<SkillCatalog>('GET', '/api/skills'),
  getDesignSystem: (pid: string, did: string) => json<DesignSystemState>('GET', `${d(pid, did)}/design-system`),
  applyPack: async (pid: string, did: string, packId: string): Promise<ApplyPackResult> => {
    const res = await request('POST', `${d(pid, did)}/design-system/apply`, { packId }, pickMessage);
    return (await res.json()) as ApplyPackResult;
  },
  savePack: (pid: string, did: string, input: { name: string; packId?: string; asNew?: boolean }) => json<SavePackResult>('POST', `${d(pid, did)}/design-system/save`, input),
  createDesignSystemDraft: (form: FormData) => json<DesignSystemDraftResult>('POST', '/api/design-systems/draft', form),
  getDesignSystemDraft: (pid: string) => json<DesignSystemDraftInfo>('GET', `${p(pid)}/design-system-draft`),
  createToken: async (pid: string, did: string, req: CreateTokenRequest) => {
    const res = await request('POST', `${d(pid, did)}/design-system/tokens`, req, pickMessage);
    return (await res.json()) as CreateTokenResult;
  },
  previewTokens: async (pid: string, did: string, changes: TokenChange[]) => {
    const res = await request('POST', `${d(pid, did)}/design-system/preview`, { changes }, pickMessage);
    return (await res.json()) as TokenPreviewResult;
  },
  updateTokens: async (pid: string, did: string, changes: TokenChange[]) => {
    const res = await request('POST', `${d(pid, did)}/design-system/tokens/update`, { changes }, pickMessage);
    return (await res.json()) as UpdateTokensResult;
  },
  getTweaks: (pid: string, did: string) => json<TweaksState>('GET', `${d(pid, did)}/tweaks`),
  commitTweaks: async (pid: string, did: string, values: Record<string, TweakValue>) => {
    const res = await request('POST', `${d(pid, did)}/tweaks/commit`, { values }, pickMessage);
    return (await res.json()) as CommitTweaksResult;
  },
  importProject: (path: string) => json<{ project: Project }>('POST', '/api/projects/import', { path }),
  listWorkspaces: () => json<WorkspaceList>('GET', '/api/workspaces'),
  addWorkspace: (path: string, label?: string) => json<WorkspaceFolder>('POST', '/api/workspaces', { path, ...(label ? { label } : {}) }),
  renameWorkspace: (id: string, label: string) => json<WorkspaceFolder>('PATCH', `/api/workspaces/${encodeURIComponent(id)}`, { label }),
  removeWorkspace: (id: string) => json<{ ok: true }>('DELETE', `/api/workspaces/${encodeURIComponent(id)}`),
  setDefaultFolder: (path: string) => json<WorkspaceList>('PUT', '/api/workspaces/default', { path }),
  hiddenProjects: () => json<{ count: number; target: string }>('GET', '/api/hidden-projects'),
  moveHiddenProjects: () => json<{ moved: string[]; failed: { projectId: string; error: string }[] }>('POST', '/api/hidden-projects/move'),
  pickFolder: async (input: { title: string; defaultPath?: string }): Promise<string | null> => {
    const res = await request('POST', '/api/pick-folder', input);
    if (res.status === 204) return null;
    return ((await res.json()) as { path: string }).path;
  },
  getProject: (pid: string) => json<Project>('GET', p(pid)),
  updateSettings: (pid: string, settings: Partial<ProjectSettings>) => json<Project>('PATCH', `${p(pid)}/settings`, settings),
  uploadAttachment: (pid: string, file: File) => {
    const form = new FormData();
    form.append('file', file, file.name);
    return json<Attachment>('POST', `${p(pid)}/attachments`, form);
  },
  getDesignMd: (pid: string) => json<{ content: string }>('GET', `${p(pid)}/design-md`),
  putDesignMd: (pid: string, content: string) => json<{ ok: boolean }>('PUT', `${p(pid)}/design-md`, { content }),
  projectFile: async (pid: string, filePath: string) => {
    const res = await request('GET', `${p(pid)}/files?path=${encodeURIComponent(filePath)}`);
    return res.blob();
  },
  listRuns: (pid: string) => json<RunSummary[]>('GET', `${p(pid)}/runs`),
  createDirection: (pid: string, fromVersionId: string, name: string) =>
    json<Direction>('POST', `${p(pid)}/directions`, { fromVersionId, name }),
  listVersions: (pid: string, did: string) => json<Version[]>('GET', `${d(pid, did)}/versions`),
  status: (pid: string, did: string) => json<WorkTreeStatus>('GET', `${d(pid, did)}/status`),
  startRun: (pid: string, did: string, req: RunRequest & { referenceUrls?: string[] }) => json<{ runId: string }>('POST', `${d(pid, did)}/runs`, req),
  undo: (pid: string, did: string) => json<Version>('POST', `${d(pid, did)}/undo`),
  editHistory: (pid: string, did: string) => json<EditHistoryState>('GET', `${p(pid)}/edit-history?did=${encodeURIComponent(did)}`),
  editHistoryStep: async (pid: string, did: string, kind: 'undo' | 'redo') => {
    const res = await request('POST', `${d(pid, did)}/edit-history/${kind}`, undefined, pickMessage);
    return (await res.json()) as { state: EditHistoryState; version: Version };
  },
  restore: (pid: string, did: string, versionId: string) =>
    json<Version>('POST', `${d(pid, did)}/restore`, { versionId }),
  keep: (pid: string, did: string) => json<Version>('POST', `${d(pid, did)}/keep`),
  discard: (pid: string, did: string) => json<WorkTreeStatus>('POST', `${d(pid, did)}/discard`),
  directionPreview: (pid: string, did: string) => json<{ url: string }>('GET', `${d(pid, did)}/preview`),
  directEdit: (pid: string, did: string, req: DirectEditRequest) =>
    timedEdit(pid, did, editKind(req), 1, async () => (await (await request('POST', `${d(pid, did)}/direct-edit`, req, pickMessage)).json()) as DirectEditResult),
  directEditBatch: (pid: string, did: string, batch: DirectEditBatch) =>
    timedEdit(pid, did, 'batch', batch.edits.length, async () => (await (await request('POST', `${d(pid, did)}/direct-edit`, batch, pickMessage)).json()) as DirectEditBatchResult),
  workTreeFiles: (pid: string, did: string) => json<{ files: string[] }>('GET', `${d(pid, did)}/tree`),
  renderCheck: (pid: string, did: string) => json<RenderCheckResult[]>('POST', `${d(pid, did)}/check`),
  versionPreview: (pid: string, vid: string) =>
    json<{ url: string }>('GET', `${p(pid)}/versions/${encodeURIComponent(vid)}/preview`),
  exportVersion: async (pid: string, vid: string) => {
    const res = await request('GET', `${p(pid)}/versions/${encodeURIComponent(vid)}/export`);
    return res.blob();
  },
  getRun: (runId: string) =>
    json<{ summary: RunSummary; events: StudioEvent[] }>('GET', `/api/runs/${encodeURIComponent(runId)}`),
  cancelRun: (runId: string) => json<{ ok: boolean }>('POST', `/api/runs/${encodeURIComponent(runId)}/cancel`),
  setQueue: (runId: string, items: QueuedMessage[]) => json<{ ok: boolean }>('PUT', `/api/runs/${encodeURIComponent(runId)}/queue`, { items }),
  steerRun: (runId: string, text: string) => json<{ ok: boolean }>('POST', `/api/runs/${encodeURIComponent(runId)}/steer`, { text }),
  commandRules: (projectId: string) => json<{ rules: string[] }>('GET', `/api/projects/${encodeURIComponent(projectId)}/command-rules`),
  removeCommandRule: (projectId: string, rule: string) =>
    json<{ rules: string[] }>('POST', `/api/projects/${encodeURIComponent(projectId)}/command-rules/remove`, { rule }),
  answerPermission: (runId: string, requestId: string, decision: PermissionDecision) =>
    json<{ ok: boolean }>('POST', `/api/runs/${encodeURIComponent(runId)}/permissions/${encodeURIComponent(requestId)}`, decision),
  postTelemetry: (sample: TelemetrySample) => json<{ ok: boolean }>('POST', '/api/telemetry', sample),
  getTelemetry: (pid: string) => json<TelemetrySample[]>('GET', `/api/telemetry?projectId=${encodeURIComponent(pid)}`),
};

function editKind(req: DirectEditRequest): string {
  if (req.move) return 'move';
  if (req.text !== undefined) return 'text';
  if (req.name !== undefined) return 'name';
  return 'style';
}

async function timedEdit<T>(pid: string, did: string, kind: string, count: number, commit: () => Promise<T>): Promise<T> {
  const started = performance.now();
  const result = await commit();
  sendTelemetry({ kind: 'edit.commit', projectId: pid, directionId: did, ms: Math.round(performance.now() - started), detail: { kind, count } });
  return result;
}

export function sendTelemetry(sample: Omit<TelemetrySample, 'ts'>): void {
  api.postTelemetry({ ...sample, ts: Date.now() }).catch(() => undefined);
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function eventsUrl(pid: string, after: number): string {
  const token = encodeURIComponent(getSession().token);
  return `${p(pid)}/events?token=${token}&after=${after}`;
}
