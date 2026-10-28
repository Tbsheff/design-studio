import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { RUN_EFFORTS, RUN_LEVELS, STUDIO_TOKEN_HEADER, isRunLevel, type RunEffort } from '../../shared/contracts.js';
import type {
  Attachment,
  Direction,
  DirectEditBatchResult,
  StructureEditResult,
  DirectEditResult,
  DirectionVariation,
  DraftImproveStart,
  Project,
  ProjectKind,
  ProjectSettings,
  RunLevel,
  RunRequest,
  SessionResetReason,
  RunSummary,
  RunSentRecord,
  StudioEvent,
  TelemetrySample,
  Version,
} from '../../shared/contracts.js';
import { levelOf } from '../../shared/run-levels.js';
import { discoverSkills } from '../agent/skills.js';
import { REPO_ROOT } from '../config.js';
import { resourcePath, resourcesDir } from '../resources.js';
import { createToken } from '../design-system/create-token.js';
import { createPackLibrary } from '../design-system/library.js';
import { applyPack, packRegistry } from '../design-system/packs.js';
import type { LoadedPack, PackRegistry } from '../design-system/packs.js';
import { loadDesignSystemPromptContext, readDesignSystemState } from '../design-system/state.js';
import { appTokensFor } from '../design-system/app-tokens/source.js';
import { previewAppTokens, updateAppTokens } from '../design-system/app-tokens/write.js';
import { invalidateTokenSource, invalidateTokenSourceOnChange, previewTokens } from '../design-system/token-preview.js';
import { updateTokens } from '../design-system/update-tokens.js';
import { commitTweaks } from '../tweaks/commit.js';
import { readTweaksState } from '../tweaks/store.js';
import { applyDirectEditBatch } from '../direct-edit/batch.js';
import { DirectEditError, applyDirectEdit } from '../direct-edit/index.js';
import { createEditHistory, type EditHistory } from '../direct-edit/history.js';
import { registerEditHistoryRoutes } from './edit-history-routes.js';
import { isDirectEditBatch, isStructureEdit } from '../direct-edit/validate.js';
import { applyStructureEdit } from '../direct-edit/structure-apply.js';
import { applyStyleReplace } from '../direct-edit/replace.js';
import { isStyleReplaceBody, type StyleReplaceResult } from '../../shared/style-search.js';
import { BadRequestError, ConflictError, NotFoundError, PickAppError, assertSafeId, isNodeError } from '../store/errors.js';
import { createKeyedMutex } from '../store/mutex.js';
import { createCommentStore, type CommentStore } from '../store/comments.js';
import { createCommandRuleStore } from '../store/command-rules.js';
import { registerCommentRoutes } from './comments-routes.js';
import { registerExportRoutes } from './export-routes.js';
import { registerRunControlRoutes } from './run-control-routes.js';
import { registerRunTitleRoutes } from './run-title-routes.js';
import { listWorkTree, parseMentions, readMentionFiles } from './mentions.js';
import { registerDesignSystemRoutes } from './design-systems-routes.js';
import { draftAttachmentIds } from '../design-system/draft-project.js';
import { createLiveDrafts } from '../design-system/draft-live.js';
import { createFetcher } from '../design-system/extract/draft.js';
import { registerPackRoutes } from './packs-routes.js';
import { registerComponentRoutes } from './components-routes.js';
import { registerPropsRoutes } from './props-routes.js';
import { registerReviewRoutes } from './review-routes.js';
import { createComponentService } from '../components/thumbs.js';
import type { StudioProjectStore } from '../store/projects.js';
import type { AgentRunner, EventBus, PreviewService, RunHandle, ServerConfig, VersionStore } from '../types.js';
import { renderIndexHtml, serveStatic } from './static.js';
import { registerVariationRoutes } from '../variations/routes.js';
import { createWorkspaceStore, type WorkspaceStore } from '../store/workspaces.js';
import { createDefaultFolderStore, type DefaultFolderStore } from '../store/default-folder.js';
import { createFolderPicker, type FolderPicker } from './pick-folder.js';
import { registerFolderInspectRoutes } from './folder-inspect-routes.js';
import { nameFromPrompt } from '../../shared/folders.js';
import { captureReferencePage, parseReferenceUrls } from '../reference-page.js';
import { createProjectLibrary } from '../store/project-library.js';
import { createThumbnailService, type ThumbnailService } from '../thumbnails.js';
import { registerHomeRoutes } from './home-routes.js';
import { finishAttach, registerAppRoutes } from './app-routes.js';
import { registerVersionRoutes } from './version-routes.js';
import { createVersionNames } from '../store/version-names.js';
import { CANVAS_FILE } from '../../shared/canvas-file.js';
import { parseStatesRequest } from '../../shared/states.js';
import { withLofi } from '../../shared/lofi.js';
import { createCanvasService, type CanvasService } from '../canvas/service.js';
import { registerCanvasRoutes } from './canvas-routes.js';
import { registerMcpRoutes } from './mcp-routes.js';
import { registerShipRoutes } from './ship-routes.js';

const STOP_WAIT_MS = 10_000;

interface AppDeps {
  config: ServerConfig;
  bus: EventBus;
  projects: StudioProjectStore;
  versions: VersionStore;
  runner: AgentRunner;
  preview: PreviewService;
  packs?: PackRegistry;
  uiDir?: string;
  comments?: CommentStore;
  workspaces?: WorkspaceStore;
  defaultFolder?: DefaultFolderStore;
  folderPicker?: FolderPicker;
  thumbnails?: ThumbnailService;
  editHistory?: EditHistory;
  canvas?: CanvasService;
}

const DEV_UI_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173'];
const HEARTBEAT_MS = 15_000;
const TELEMETRY_KINDS = new Set<TelemetrySample['kind']>(['preview.latency', 'select.latency', 'studio.open', 'file.write', 'app.start', 'run.first_token', 'edit.commit', 'frame.long']);
const APP_TELEMETRY_KINDS = new Set<TelemetrySample['kind']>(['app.start', 'frame.long']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readBody(c: Context): Promise<Record<string, unknown>> {
  const text = await c.req.text();
  if (text.trim() === '') return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BadRequestError('body must be JSON');
  }
  if (!isRecord(parsed)) throw new BadRequestError('body must be a JSON object');
  return parsed;
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || value.trim() === '') throw new BadRequestError(`${key} is required`);
  return value;
}

function optionalString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new BadRequestError(`${key} must be a string`);
  return value;
}

function freshSessionPatch(reason: SessionResetReason): Partial<Direction> {
  return { sessionId: null, sessionCostUsd: 0, sessionResetReason: reason };
}

const StartRunFlag = z.boolean().optional();

function parseStartRun(raw: unknown): boolean {
  const result = StartRunFlag.safeParse(raw);
  if (!result.success) throw new BadRequestError('startRun must be true or false');
  return result.data ?? true;
}

function parseLevel(raw: unknown): RunLevel | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRunLevel(raw)) throw new BadRequestError(`level must be one of ${RUN_LEVELS.join(', ')}`);
  return raw;
}

function parseRunExtras(body: Record<string, unknown>): Pick<RunRequest, 'effort' | 'retryOf' | 'plan' | 'mentions'> {
  const extras: Pick<RunRequest, 'effort' | 'retryOf' | 'plan' | 'mentions'> = {};
  if (body.plan === true) extras.plan = true;
  if (body.effort !== undefined) {
    if (!RUN_EFFORTS.includes(body.effort as RunEffort)) throw new BadRequestError('effort must be low, medium or high');
    extras.effort = body.effort as RunEffort;
  }
  if (body.retryOf !== undefined) extras.retryOf = assertSafeId(String(body.retryOf), 'retryOf');
  const mentions = parseMentions(body.mentions);
  if (mentions?.length) extras.mentions = mentions;
  return extras;
}

function parseRunRequest(body: Record<string, unknown>): RunRequest {
  const prompt = requireString(body, 'prompt');
  const mode = body.mode ?? 'edit';
  if (mode !== 'edit' && mode !== 'critique') throw new BadRequestError('mode must be edit or critique');
  const request: RunRequest = { prompt, mode };
  const level = parseLevel(body.level);
  if (level) request.level = level;
  Object.assign(request, parseRunExtras(body));
  if (body.selection !== undefined) {
    if (!Array.isArray(body.selection)) throw new BadRequestError('selection must be an array');
    request.selection = body.selection as RunRequest['selection'];
  }
  if (body.attachmentIds !== undefined) {
    if (!Array.isArray(body.attachmentIds) || !body.attachmentIds.every((id) => typeof id === 'string')) {
      throw new BadRequestError('attachmentIds must be an array of strings');
    }
    request.attachmentIds = body.attachmentIds as string[];
  }
  parseRunTask(body, request);
  return request;
}

function parseRunTask(body: Record<string, unknown>, request: RunRequest): void {
  if (body.task !== undefined) {
    if (body.task !== 'tweaks' && body.task !== 'design-system') throw new BadRequestError('task must be tweaks or design-system');
    if (request.mode !== 'edit') throw new BadRequestError(`task ${body.task} needs mode edit`);
    request.task = body.task;
  }
  if (body.states === undefined) return;
  const states = parseStatesRequest(body.states);
  if (!states) throw new BadRequestError('states must be {path, frame, width, height}');
  if (request.mode !== 'edit' || request.task) throw new BadRequestError('states needs an edit run with no task');
  request.states = states;
}

const settingsSchema = z
  .object({
    model: z.string().trim().min(1).max(200),
    maxBudgetUsd: z.number().min(0.01).max(50).nullable(),
    maxTurns: z.number().int().min(1).max(200),
    allowBash: z.boolean(),
    allowInstall: z.boolean(),
    autoApprove: z.boolean(),
    disabledSkills: z
      .array(z.string().regex(/^[^:\s]+:[^:\s]+$/, 'must be a skill id like plugin:skill; see GET /api/skills'))
      .max(1000)
      .transform((ids) => [...new Set(ids)]),
    defaultLevel: z.enum(RUN_LEVELS as unknown as [RunLevel, ...RunLevel[]]),
  })
  .partial()
  .strict();

function parseSettings(raw: unknown): Partial<ProjectSettings> | undefined {
  if (raw === undefined || raw === null) return undefined;
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `settings.${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
    throw new BadRequestError(`invalid settings: ${detail}`);
  }
  const settings: Partial<ProjectSettings> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) Object.assign(settings, { [key]: value });
  }
  return settings;
}

async function resolvePack(registry: PackRegistry, raw: unknown): Promise<LoadedPack | null> {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string' || raw.trim() === '') throw new BadRequestError('packId must be a string or null');
  const pack = await registry.get(raw);
  if (!pack) throw new BadRequestError(`unknown packId: ${raw}`);
  return pack;
}


function parseJsonLines<T>(text: string): T[] {
  const items: T[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      items.push(JSON.parse(line) as T);
    } catch {
      continue;
    }
  }
  return items;
}

const PROJECT_FILE_DIRS = ['checks', 'runs'];

async function resolveProjectFile(projectDir: string, requested: string): Promise<string> {
  if (requested.includes('\0')) throw new BadRequestError('invalid path');
  const realProject = await realpath(projectDir);
  const candidate = path.resolve(projectDir, requested);
  const real = await realpath(candidate).catch(() => {
    throw new NotFoundError('file not found');
  });
  if (path.extname(real).toLowerCase() !== '.png') throw new NotFoundError('file not found');
  const allowed = PROJECT_FILE_DIRS.some((dir) => real.startsWith(path.join(realProject, dir) + path.sep));
  if (!allowed) throw new NotFoundError('file not found');
  return real;
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null;
    throw error;
  }
}

export function isRunSummary(value: unknown): value is RunSummary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Partial<RunSummary>;
  return typeof record.id === 'string' && typeof record.status === 'string' && typeof record.request === 'object' && record.request !== null;
}

export function createApp(deps: AppDeps): Hono {
  const { config, bus, projects, versions, runner, preview } = deps;
  const uiDir = deps.uiDir ?? resourcePath('ui', path.join(REPO_ROOT, 'dist', 'ui'));
  const packs = deps.packs ?? packRegistry(undefined, { userDir: path.join(config.dataDir, 'packs') });
  const defaultFolder = deps.defaultFolder ?? createDefaultFolderStore(config.dataDir, config.projectsDir);
  const workspaces = deps.workspaces ?? createWorkspaceStore(config.dataDir, { defaultFolder });
  const folderPicker = deps.folderPicker ?? createFolderPicker();
  const allowedOrigins = new Set([config.studioOrigin, ...(resourcesDir() ? [] : DEV_UI_ORIGINS)]);
  const runProjectIndex = new Map<string, string>();
  const directionLock = createKeyedMutex();
  const editHistory = deps.editHistory ?? createEditHistory({ bus, onRestored: (workTree) => invalidateTokenSource(workTree) });
  const editDeps = { bus, projects, versions, runner, history: editHistory };
  const canvas = deps.canvas ?? createCanvasService(bus, (projectId) => projects.projectDir(projectId));
  const announceCanvas = (project: Project): void => {
    void canvas.announce(project).catch((error: unknown) => console.error('[http] canvas announce failed', error));
  };
  const announceCanvasAt = async (workTree: string): Promise<void> => {
    const owner = (await projects.list()).find((project) => canvas.ownerOf(project).workTree === workTree);
    if (owner) announceCanvas(owner);
  };
  const app = new Hono();
  let openStreams = 0;
  const versionNames = createVersionNames((pid) => projects.projectDir(pid));
  const thumbnails = deps.thumbnails ?? createThumbnailService({ projects, preview, versions });

  const projectsRoot = path.join(config.dataDir, 'projects');
  const runsDir = (projectId: string): string => path.join(projects.projectDir(projectId), 'runs');
  const telemetryFile = (projectId: string): string => path.join(projects.projectDir(projectId), 'telemetry.jsonl');
  const appTelemetryFile = path.join(config.dataDir, 'telemetry.jsonl');

  const loadDirection = async (pid: string, did: string): Promise<{ project: Project; direction: Direction }> => {
    const project = await projects.get(pid);
    return { project, direction: projects.directionOf(project, assertSafeId(did, 'directionId')) };
  };

  const withDirection = <T>(pid: string, did: string, task: (project: Project, direction: Direction) => Promise<T>): Promise<T> =>
    directionLock(`${pid}/${did}`, async () => {
      const { project, direction } = await loadDirection(pid, did);
      return task(project, direction);
    });

  const emitStatus = async (project: Project, direction: Direction): Promise<void> => {
    const status = await versions.status(project, direction);
    bus.emit({ type: 'status.changed', projectId: project.id, directionId: direction.id, status });
  };

  const recordVersion = async (project: Project, direction: Direction, version: Version, resetSession?: SessionResetReason): Promise<Direction> => {
    bus.emit({ type: 'version.created', projectId: project.id, directionId: direction.id, version });
    if (resetSession && direction.id === canvas.ownerOf(project).id) announceCanvas(project);
    const patch: Partial<Direction> = resetSession ? { headVersionId: version.id, ...freshSessionPatch(resetSession) } : { headVersionId: version.id };
    const updated = await projects.updateDirection(project.id, direction.id, patch);
    bus.emit({ type: 'direction.updated', projectId: project.id, directionId: direction.id, direction: updated });
    return updated;
  };

  const commitInit = async (project: Project, title?: string, kind: 'init' | 'manual' = 'init'): Promise<Project> => {
    const main = projects.mainDirection(project);
    const version = await versions.commit(project, main, title ?? (project.imported && !project.imported.created ? 'Imported' : 'Starter template'), { kind });
    if (version) await recordVersion(project, main, version);
    return projects.get(project.id);
  };

  const applyPackOnCreate = async (project: Project, pack: LoadedPack, designMd: string | undefined): Promise<Project> => {
    await applyPack(project, projects.mainDirection(project).workTree, pack, { userDesignMd: designMd });
    await projects.setPackId(project.id, pack.manifest.id);
    return commitInit(await projects.get(project.id), `Apply ${pack.manifest.name} design system`);
  };

  const syncPackId = async (project: Project, direction: Direction): Promise<void> => {
    if (projects.mainDirection(project).id !== direction.id) return;
    const onDisk = (await readDesignSystemState(project, direction)).manifest;
    const id = onDisk && typeof onDisk.id === 'string' ? onDisk.id : null;
    if (id !== (project.packId ?? null)) await projects.setPackId(project.id, id);
  };

  const prepareCreated = async (created: Project, pack: LoadedPack | null, designMd: string | undefined): Promise<Project> => {
    if (!pack && designMd !== undefined && designMd.trim() !== '') await projects.writeDesignMd(created.id, designMd);
    const started = created.kind === 'react' ? await commitInit(created) : created;
    return pack ? applyPackOnCreate(started, pack, designMd) : started;
  };

  const markLofi = async (project: Project, direction: Direction, request: RunRequest): Promise<void> => {
    if (request.mode !== 'edit' || request.task || request.plan) return;
    const on = request.level === 'wireframe';
    await canvas.update(project, (file) => withLofi(file, direction.id, on), { source: 'run' }).catch((error: unknown) => console.error('[http] lo-fi mark failed', error));
  };

  const startRun = async (project: Project, direction: Direction, input: RunRequest): Promise<string> => {
    const request: RunRequest = { ...input, level: levelOf(input, project.settings) };
    const attachments: Attachment[] = await Promise.all(
      (request.attachmentIds ?? []).map((id) => projects.getAttachment(project.id, id)),
    );
    const designMd = await projects.readDesignMd(project.id);
    const designSystem = await loadDesignSystemPromptContext(direction.workTree, project).catch((error: unknown) => {
      console.error('[http] design system load failed', error);
      return null;
    });
    const previewUrl = await preview.directionUrl(project, direction).catch((error: unknown) => {
      console.error('[http] preview url failed', error);
      return null;
    });
    const mentionFiles = await readMentionFiles(direction.workTree, request.mentions);
    await markLofi(project, direction, request);
    const handle = runner.start({ project, direction, request, attachments, designMd, designSystem, previewUrl, mentionFiles });
    runProjectIndex.set(handle.runId, project.id);
    if (!request.task && !request.variation) void handle.done.then(() => continueWithNext(project.id, direction.id, request, handle), () => undefined);
    return handle.runId;
  };

  const waitForStop = async (pid: string, did: string): Promise<void> => {
    const pending = runner.stopping?.(pid, did);
    if (pending) await Promise.race([pending.catch(() => undefined), new Promise((resolve) => setTimeout(resolve, STOP_WAIT_MS))]);
  };

  const continueWithNext = async (pid: string, did: string, previous: RunRequest, handle: RunHandle): Promise<void> => {
    const next = handle.next?.();
    if (!next) return;
    try {
      const project = await projects.get(pid);
      const direction = project.directions.find((candidate) => candidate.id === did);
      if (!direction || runner.isRunning(pid, did)) return;
      await startRun(project, direction, { prompt: next.text, mode: previous.mode, ...(previous.level ? { level: previous.level } : {}), ...(previous.effort ? { effort: previous.effort } : {}) });
    } catch (error) {
      console.error(`[http] could not send the ${next.reason} message`, error);
    }
  };

  const findRunProject = async (runId: string): Promise<string | null> => {
    const known = runProjectIndex.get(runId);
    if (known) return known;
    if (!existsSync(projectsRoot)) return null;
    for (const entry of await readdir(projectsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const base = path.join(projectsRoot, entry.name, 'runs', runId);
      if (existsSync(`${base}.json`) || existsSync(`${base}.jsonl`)) {
        runProjectIndex.set(runId, entry.name);
        return entry.name;
      }
    }
    return null;
  };

  const addParentFolder = async (parentPath: string | undefined, created: Project): Promise<void> => {
    const parent = path.dirname(projects.mainDirection(created).workTree);
    if (parentPath !== undefined && parent !== (await defaultFolder.current())) {
      await workspaces.add({ path: parent }).catch((error: unknown) => console.error('[http] could not save the parent folder', error));
    }
  };

  const watchDirection = (project: Project, direction: Direction): void => {
    try {
      preview.watch(project, direction);
    } catch (error) {
      console.error('[http] watch failed', error);
    }
  };

  const forkDirection = async (pid: string, input: { name: string; fromVersionId: string | null; variation?: DirectionVariation }): Promise<Direction> => {
    const added = await projects.addDirection(pid, { name: input.name, fromVersionId: input.fromVersionId });
    const project = await projects.get(pid);
    let direction = added;
    const version = await versions.commit(project, added, `Forked as ${added.name}`, { kind: 'fork' });
    const extra: Partial<Direction> = input.variation ? { variation: input.variation } : {};
    if (version) {
      bus.emit({ type: 'version.created', projectId: pid, directionId: added.id, version });
      direction = await projects.updateDirection(pid, added.id, { headVersionId: version.id, parentVersionId: added.parentVersionId ?? version.parentId, ...extra });
    } else if (input.variation) {
      direction = await projects.updateDirection(pid, added.id, extra);
    }
    bus.emit({ type: 'direction.updated', projectId: pid, directionId: direction.id, direction });
    watchDirection(await projects.get(pid), direction);
    return direction;
  };
  app.onError((error, c) => {
    const status = error instanceof NotFoundError ? 404 : error instanceof BadRequestError ? 400 : error instanceof ConflictError ? 409 : 500;
    if (status === 500) console.error('[http]', error);
    if (error instanceof PickAppError) return c.json({ error: error.message, code: 'pick_app', candidates: error.candidates }, 409);
    return c.json({ error: error.message }, status);
  });

  app.get('/api/session', (c) => {
    if (c.req.header('sec-fetch-site') !== 'same-origin') return c.json({ error: 'forbidden' }, 403);
    return c.json({ token: config.studioToken, previewOrigin: config.previewOrigin });
  });

  app.use('/api/*', async (c, next) => {
    const origin = c.req.header('origin');
    if (origin !== undefined && !allowedOrigins.has(origin)) return c.json({ error: 'forbidden' }, 403);
    const isEventStream = c.req.method === 'GET' && /^\/api\/projects\/[^/]+\/events$/.test(c.req.path);
    const token = c.req.header(STUDIO_TOKEN_HEADER) ?? (isEventStream ? c.req.query('token') : undefined);
    if (token !== config.studioToken) return c.json({ error: 'forbidden' }, 403);
    await next();
  });

  app.get('/api/projects', async (c) => c.json(await projects.list()));

  app.get('/api/skills', async (c) => c.json(await discoverSkills()));

  app.post('/api/projects', async (c) => {
    const body = await readBody(c);
    const prompt = requireString(body, 'prompt');
    const kind = (body.kind ?? 'html') as ProjectKind;
    if (kind !== 'html' && kind !== 'react') throw new BadRequestError('kind must be html or react');
    const settings = parseSettings(body.settings);
    const designMd = optionalString(body, 'designMd');
    const pack = await resolvePack(packs, body.packId);
    const level = parseLevel(body.level);
    const shouldStartRun = parseStartRun(body.startRun);
    const parentPath = optionalString(body, 'parentPath');
    const name = optionalString(body, 'name') ?? nameFromPrompt(prompt);
    const referenceUrls = parseReferenceUrls(body.referenceUrls, config.fetchAllowLoopback === true);
    const created = await projects.createInFolder({ parentPath: parentPath ?? (await defaultFolder.ensure()), name, kind, settings });
    await addParentFolder(parentPath, created);
    await versions.ensureRepo(created);
    const project = await prepareCreated(created, pack, designMd);
    const main = projects.mainDirection(project);
    watchDirection(project, main);
    if (!shouldStartRun) return c.json({ project, runId: null });
    const referencePages = await Promise.all(referenceUrls.map((url) => captureReferencePage(url, config.fetchAllowLoopback === true)));
    const runId = await startRun(project, main, { prompt, mode: 'edit', ...(level ? { level } : {}), ...(referencePages.length > 0 ? { referencePages } : {}) });
    return c.json({ project, runId });
  });

  const appRouteDeps = { projects, versions, preview, readBody, commitInit: (project: Project) => commitInit(project), watch: (project: Project, direction: Direction) => watchDirection(project, direction) };
  registerAppRoutes(app, appRouteDeps);
  registerFolderInspectRoutes(app, { projects, readBody });

  app.post('/api/projects/import', async (c) => {
    const body = await readBody(c);
    const appDir = optionalString(body, 'appDir');
    const imported = await projects.importFolder(requireString(body, 'path'), { ...(appDir ? { appDir } : {}), skipApp: body.skipApp === true });
    if (imported.app) return c.json({ project: await finishAttach(appRouteDeps, imported) });
    await versions.ensureRepo(imported);
    const project = await commitInit(imported);
    watchDirection(project, projects.mainDirection(project));
    return c.json({ project });
  });

  app.get('/api/workspaces', async (c) => c.json(await workspaces.list()));

  app.post('/api/workspaces', async (c) => {
    const body = await readBody(c);
    return c.json(await workspaces.add({ path: requireString(body, 'path'), label: optionalString(body, 'label') }));
  });

  app.put('/api/workspaces/default', async (c) => {
    const body = await readBody(c);
    const previous = await defaultFolder.current();
    const next = await defaultFolder.set(requireString(body, 'path'));
    if (previous !== next && existsSync(previous)) {
      await workspaces.add({ path: previous }).catch((error: unknown) => console.error('[http] could not keep the old default folder', error));
    }
    return c.json(await workspaces.list());
  });

  app.get('/api/hidden-projects', async (c) => {
    const hidden = (await projects.list()).filter((project) => projects.isHidden(project));
    return c.json({ count: hidden.length, target: await defaultFolder.current() });
  });

  app.post('/api/hidden-projects/move', async (c) => {
    const hidden = (await projects.list()).filter((project) => projects.isHidden(project));
    const moved: string[] = [];
    const failed: { projectId: string; error: string }[] = [];
    if (hidden.length === 0) return c.json({ moved, failed });
    const target = await defaultFolder.ensure();
    for (const project of hidden) {
      const main = projects.mainDirection(project);
      try {
        const updated = await directionLock(`${project.id}/${main.id}`, async () => {
          if (project.directions.some((direction) => runner.isRunning(project.id, direction.id))) throw new ConflictError('run_in_progress');
          await preview.release(project, main);
          const next = await projects.moveIntoFolder(project.id, target);
          await preview.release(next, main);
          return next;
        });
        bus.emit({ type: 'direction.updated', projectId: project.id, directionId: main.id, direction: projects.mainDirection(updated) });
        moved.push(project.id);
      } catch (error) {
        console.error(`[http] could not move project ${project.id}`, error);
        failed.push({ projectId: project.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return c.json({ moved, failed });
  });

  app.patch('/api/workspaces/:id', async (c) => {
    const body = await readBody(c);
    return c.json(await workspaces.rename(c.req.param('id'), requireString(body, 'label')));
  });

  app.delete('/api/workspaces/:id', async (c) => {
    await workspaces.remove(c.req.param('id'));
    return c.json({ ok: true });
  });

  app.post('/api/pick-folder', async (c) => {
    if (c.req.header('sec-fetch-site') !== undefined && c.req.header('sec-fetch-site') !== 'same-origin') return c.json({ error: 'forbidden' }, 403);
    const body = await readBody(c);
    const result = await folderPicker.pick({ title: optionalString(body, 'title'), defaultPath: optionalString(body, 'defaultPath') });
    if (result.status === 'picked') return c.json({ path: result.path });
    if (result.status === 'canceled') return c.body(null, 204);
    if (result.status === 'unsupported') return c.json({ error: 'the folder picker needs macOS; paste a path instead' }, 501);
    if (result.status === 'busy') return c.json({ error: 'a folder picker is already open' }, 409);
    if (result.status === 'timeout') return c.json({ error: 'the folder picker timed out' }, 504);
    console.error('[http] folder picker failed', result.error);
    return c.json({ error: `the folder picker failed: ${result.error}` }, 500);
  });

  app.get('/api/projects/:pid', async (c) => c.json(await projects.get(c.req.param('pid'))));

  app.patch('/api/projects/:pid/settings', async (c) => {
    const pid = c.req.param('pid');
    await projects.get(pid);
    const patch = parseSettings(await readBody(c)) ?? {};
    const project = await projects.updateSettings(pid, patch);
    return c.json(project);
  });

  const commandRules = createCommandRuleStore(projects.projectDir);

  app.get('/api/projects/:pid/command-rules', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    return c.json({ rules: await commandRules.list(project.id) });
  });

  app.post('/api/projects/:pid/command-rules/remove', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const rule = requireString(await readBody(c), 'rule');
    return c.json({ rules: await commandRules.remove(project.id, rule) });
  });

  app.get('/api/projects/:pid/events', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const rawAfter = c.req.header('last-event-id') ?? c.req.query('after') ?? '0';
    const after = Number.parseInt(rawAfter, 10);
    const afterSeq = Number.isFinite(after) && after >= 0 ? after : 0;
    return streamSSE(c, async (stream) => {
      openStreams += 1;
      const pending: StudioEvent[] = [];
      let wake: (() => void) | null = null;
      let closed = false;
      const unsubscribe = bus.subscribe(project.id, (event) => {
        pending.push(event);
        wake?.();
      });
      const heartbeat = setInterval(() => {
        void stream.write(': ping\n\n').catch(() => undefined);
      }, HEARTBEAT_MS);
      stream.onAbort(() => {
        closed = true;
        wake?.();
      });
      try {
        let lastSent = afterSeq;
        const send = async (event: StudioEvent): Promise<void> => {
          if (event.seq <= lastSent) return;
          lastSent = event.seq;
          await stream.writeSSE({ id: String(event.seq), event: event.type, data: JSON.stringify(event) });
        };
        for (const event of bus.since(project.id, afterSeq)) await send(event);
        while (!closed) {
          const batch = pending.splice(0, pending.length);
          for (const event of batch) await send(event);
          if (pending.length === 0 && !closed) {
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
            wake = null;
          }
        }
      } finally {
        openStreams -= 1;
        clearInterval(heartbeat);
        unsubscribe();
      }
    });
  });

  app.post('/api/projects/:pid/attachments', async (c) => {
    const pid = c.req.param('pid');
    const form = await c.req.parseBody();
    const file = form.file;
    if (!(file instanceof File)) throw new BadRequestError('multipart field "file" is required');
    const attachment = await projects.saveAttachment(pid, {
      name: file.name,
      mime: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return c.json(attachment);
  });

  app.get('/api/projects/:pid/design-md', async (c) => {
    const content = await projects.readDesignMd(c.req.param('pid'));
    return c.json({ content: content ?? '' });
  });

  app.put('/api/projects/:pid/design-md', async (c) => {
    const body = await readBody(c);
    const content = body.content;
    if (typeof content !== 'string') throw new BadRequestError('content must be a string');
    const pid = c.req.param('pid');
    await projects.writeDesignMd(pid, content);
    const project = await projects.get(pid);
    const main = projects.mainDirection(project);
    const version = await versions.commitFile(project, main, 'DESIGN.md', 'Update DESIGN.md', { kind: 'manual' });
    if (version) await recordVersion(project, main, version);
    await emitStatus(project, main);
    return c.json({ ok: true, versionId: version?.id ?? null });
  });

  app.get('/api/projects/:pid/files', async (c) => {
    const pid = c.req.param('pid');
    await projects.get(pid);
    const file = await resolveProjectFile(projects.projectDir(pid), c.req.query('path') ?? '');
    const bytes = await readFile(file);
    return new Response(new Uint8Array(bytes), { headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } });
  });

  app.get('/api/projects/:pid/runs', async (c) => {
    const pid = c.req.param('pid');
    await projects.get(pid);
    const dir = runsDir(pid);
    if (!existsSync(dir)) return c.json([]);
    const summaries: RunSummary[] = [];
    for (const name of await readdir(dir)) {
      if (!name.endsWith('.json') || name.startsWith('session-')) continue;
      const text = await readOptional(path.join(dir, name));
      if (text === null) continue;
      try {
        const parsed: unknown = JSON.parse(text);
        if (isRunSummary(parsed)) summaries.push(parsed);
      } catch {
        continue;
      }
    }
    summaries.sort((a, b) => b.startedAt - a.startedAt);
    return c.json(summaries);
  });

  app.post('/api/projects/:pid/directions', async (c) => {
    const pid = c.req.param('pid');
    const body = await readBody(c);
    const fromVersionId = optionalString(body, 'fromVersionId') ?? null;
    const name = optionalString(body, 'name') ?? '';
    return c.json(await forkDirection(pid, { name, fromVersionId }));
  });

  app.get('/api/projects/:pid/d/:did/versions', async (c) => {
    const { project, direction } = await loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await versionNames.apply(project.id, await versions.list(project, direction)));
  });

  app.get('/api/projects/:pid/d/:did/design-system', async (c) => {
    const { project, direction } = await loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await readDesignSystemState(project, direction));
  });

  app.get('/api/projects/:pid/d/:did/status', async (c) => {
    const { project, direction } = await loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await versions.status(project, direction));
  });

  const withTaskInputs = async (project: Project, direction: Direction, request: RunRequest): Promise<RunRequest> => {
    if (request.task !== 'design-system') return request;
    if (!project.designSystemFor) throw new BadRequestError('task design-system works only in a design-system project');
    const exists = (id: string) => projects.getAttachment(project.id, id).then(() => true, () => false);
    const fromDraft = await draftAttachmentIds(direction.workTree, exists);
    const attachmentIds = [...new Set([...(request.attachmentIds ?? []), ...fromDraft])];
    return attachmentIds.length > 0 ? { ...request, attachmentIds } : request;
  };

  app.post('/api/projects/:pid/d/:did/runs', async (c) => {
    const body = await readBody(c);
    const request = parseRunRequest(body);
    const referenceUrls = parseReferenceUrls(body.referenceUrls, config.fetchAllowLoopback === true);
    if (referenceUrls.length > 0) request.referencePages = await Promise.all(referenceUrls.map((url) => captureReferencePage(url, config.fetchAllowLoopback === true)));
    await waitForStop(c.req.param('pid'), c.req.param('did'));
    const runId = await withDirection(c.req.param('pid'), c.req.param('did'), async (project, direction) => {
      if (runner.isRunning(project.id, direction.id)) throw new ConflictError('run_in_progress');
      if (liveDrafts.isReading(project.id)) throw new ConflictError('The studio is still reading the sources. Wait until they finish.');
      return startRun(project, direction, await withTaskInputs(project, direction, request));
    });
    return c.json({ runId });
  });

  app.post('/api/projects/:pid/d/:did/undo', async (c) => {
    const version = await withDirection(c.req.param('pid'), c.req.param('did'), async (project, direction) => {
      const restored = await versions.restore(project, direction, 'head', 'undo');
      await recordVersion(project, direction, restored, 'undo');
      await syncPackId(project, direction);
      await emitStatus(project, direction);
      return restored;
    });
    return c.json(version);
  });

  const watchedTokenProjects = new Set<string>();
  const watchTokenSources = (project: Project): void => {
    if (watchedTokenProjects.has(project.id)) return;
    watchedTokenProjects.add(project.id);
    bus.subscribe(project.id, (event) => {
      if (event.type !== 'files.changed' || event.directionId === undefined) return;
      const paths = event.paths;
      loadDirection(project.id, event.directionId)
        .then(({ direction }) => invalidateTokenSourceOnChange(direction.workTree, paths))
        .catch(() => undefined);
    });
  };

  app.post('/api/projects/:pid/d/:did/design-system/preview', async (c) => {
    const body = await readBody(c);
    try {
      const { project, direction } = await loadDirection(c.req.param('pid'), c.req.param('did'));
      watchTokenSources(project);
      const app = await appTokensFor(project, direction);
      return c.json(app ? previewAppTokens(app, body) : await previewTokens(direction.workTree, body));
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  });

  app.get('/api/projects/:pid/d/:did/tweaks', async (c) => {
    const { direction } = await loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await readTweaksState(direction.workTree));
  });

  app.post('/api/projects/:pid/d/:did/tweaks/commit', async (c) => {
    const body = await readBody(c);
    try {
      const result = await withDirection(c.req.param('pid'), c.req.param('did'), (project, direction) =>
        commitTweaks(editDeps, project, direction, body),
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  });

  app.post('/api/projects/:pid/d/:did/design-system/tokens/update', async (c) => {
    const body = await readBody(c);
    try {
      const result = await withDirection(c.req.param('pid'), c.req.param('did'), async (project, direction) =>
        (await updateAppTokens(editDeps, project, direction, body)) ?? updateTokens(editDeps, project, direction, body),
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  });

  app.post('/api/projects/:pid/d/:did/design-system/tokens', async (c) => {
    const body = await readBody(c);
    try {
      const result = await withDirection(c.req.param('pid'), c.req.param('did'), (project, direction) =>
        createToken(editDeps, project, direction, body),
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  });

  app.post('/api/projects/:pid/d/:did/direct-edit', async (c) => {
    const body = await readBody(c);
    try {
      const result = await withDirection<DirectEditResult | DirectEditBatchResult | StructureEditResult | StyleReplaceResult>(c.req.param('pid'), c.req.param('did'), (project, direction) =>
        isStyleReplaceBody(body)
          ? applyStyleReplace(editDeps, project, direction, body)
          : isStructureEdit(body)
          ? applyStructureEdit(editDeps, project, direction, body)
          : isDirectEditBatch(body)
            ? applyDirectEditBatch(editDeps, project, direction, body)
            : applyDirectEdit(editDeps, project, direction, body),
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError) return c.json({ error: error.code, message: error.message }, error.status);
      throw error;
    }
  });

  app.post('/api/projects/:pid/d/:did/restore', async (c) => {
    const versionId = requireString(await readBody(c), 'versionId');
    const version = await withDirection(c.req.param('pid'), c.req.param('did'), async (project, direction) => {
      const restored = await versions.restore(project, direction, versionId, 'restore');
      await recordVersion(project, direction, restored, 'restore');
      await syncPackId(project, direction);
      await emitStatus(project, direction);
      return restored;
    });
    return c.json(version);
  });

  app.post('/api/projects/:pid/d/:did/keep', async (c) => {
    const version = await withDirection(c.req.param('pid'), c.req.param('did'), async (project, direction) => {
      const kept = await versions.commit(project, direction, 'Kept unfinished changes', { kind: 'keep' });
      if (kept === null) throw new BadRequestError('no unfinished changes to keep');
      await recordVersion(project, direction, kept);
      await emitStatus(project, direction);
      return kept;
    });
    return c.json(version);
  });

  app.post('/api/projects/:pid/d/:did/discard', async (c) => {
    const status = await withDirection(c.req.param('pid'), c.req.param('did'), async (project, direction) => {
      const discarded = await versions.discard(project, direction);
      bus.emit({ type: 'status.changed', projectId: project.id, directionId: direction.id, status: discarded });
      return discarded;
    });
    return c.json(status);
  });

  app.get('/api/projects/:pid/d/:did/preview', async (c) => {
    const { project, direction } = await loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json({ url: await preview.directionUrl(project, direction) });
  });

  app.get('/api/projects/:pid/d/:did/tree', async (c) => {
    const { direction } = await loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json({ files: await listWorkTree(direction.workTree) });
  });

  app.post('/api/projects/:pid/d/:did/check', async (c) => {
    const { project, direction } = await loadDirection(c.req.param('pid'), c.req.param('did'));
    return c.json(await preview.renderCheck(project, direction));
  });

  app.get('/api/projects/:pid/versions/:vid/preview', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const versionId = c.req.param('vid');
    const snapshotDir = await versions.snapshot(project, versionId);
    return c.json({ url: await preview.snapshotUrl(project, versionId, snapshotDir) });
  });

  app.get('/api/projects/:pid/versions/:vid/export', async (c) => {
    const project = await projects.get(c.req.param('pid'));
    const version = await versions.get(project, c.req.param('vid'));
    const bytes = await versions.exportZip(project, version.id);
    const safeName = project.name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'design';
    return new Response(new Uint8Array(bytes), {
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${safeName}-${version.id.slice(0, 8)}.zip"`,
        'content-length': String(bytes.byteLength),
      },
    });
  });

  app.get('/api/runs/:runId', async (c) => {
    const runId = assertSafeId(c.req.param('runId'), 'runId');
    const pid = await findRunProject(runId);
    if (pid === null) throw new NotFoundError(`run ${runId} not found`);
    const base = path.join(runsDir(pid), runId);
    const summaryText = await readOptional(`${base}.json`);
    const eventsText = await readOptional(`${base}.jsonl`);
    if (summaryText === null && eventsText === null) throw new NotFoundError(`run ${runId} not found`);
    const summary = summaryText === null ? null : (JSON.parse(summaryText) as RunSummary);
    const lines = parseJsonLines<StudioEvent | RunSentRecord>(eventsText ?? '');
    const sent = lines.filter((line): line is RunSentRecord => line.type === 'run.sent');
    const events = lines.filter((line): line is StudioEvent => line.type !== 'run.sent');
    return c.json({ summary, events, sent });
  });

  registerRunControlRoutes(app, runner);
  registerRunTitleRoutes(app, { runner, findRunProject, runsDir });

  app.post('/api/runs/:runId/cancel', (c) => {
    const handle = runner.get(assertSafeId(c.req.param('runId'), 'runId'));
    if (!handle) throw new NotFoundError('run is not active');
    handle.cancel();
    return c.json({ ok: true });
  });

  app.post('/api/telemetry', async (c) => {
    const body = await readBody(c);
    const kind = body.kind as TelemetrySample['kind'];
    if (!TELEMETRY_KINDS.has(kind)) throw new BadRequestError('unknown telemetry kind');
    const projectId = APP_TELEMETRY_KINDS.has(kind) ? optionalString(body, 'projectId') : requireString(body, 'projectId');
    if (typeof body.ms !== 'number' || !Number.isFinite(body.ms)) throw new BadRequestError('ms must be a number');
    if (projectId !== undefined) await projects.get(projectId);
    const sample: TelemetrySample = { kind, ms: body.ms, ts: typeof body.ts === 'number' ? body.ts : Date.now() };
    if (projectId !== undefined) sample.projectId = projectId;
    const directionId = optionalString(body, 'directionId');
    if (directionId !== undefined) sample.directionId = directionId;
    if (isRecord(body.detail)) sample.detail = body.detail;
    const file = projectId === undefined ? appTelemetryFile : telemetryFile(projectId);
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, `${JSON.stringify(sample)}\n`);
    return c.json({ ok: true });
  });

  app.get('/api/telemetry', async (c) => {
    const projectId = c.req.query('projectId');
    const appOnly = c.req.query('scope') === 'app';
    const files = appOnly
      ? [appTelemetryFile]
      : projectId
        ? [telemetryFile(assertSafeId(projectId, 'projectId'))]
        : [appTelemetryFile, ...(await projects.list()).map((project) => telemetryFile(project.id))];
    const samples: TelemetrySample[] = [];
    for (const file of files) {
      const text = await readOptional(file);
      if (text !== null) samples.push(...parseJsonLines<TelemetrySample>(text));
    }
    samples.sort((a, b) => a.ts - b.ts);
    return c.json(samples);
  });

  const comments = deps.comments ?? createCommentStore(config.dataDir, bus);
  registerExportRoutes(app, { projects, versions, preview, comments, studioToken: config.studioToken });
  registerCommentRoutes(app, {
    comments,
    runner,
    runsDir,
    loadDirection,
    withDirection,
    startRun,
    hasAttachment: (pid, id) => projects.getAttachment(pid, id).then(() => true, () => false),
  });

  registerComponentRoutes(app, {
    service: createComponentService({ preview, scratchDir: (projectId) => path.join(projects.projectDir(projectId), '.component-shots') }),
    loadDirection,
  });
  registerPropsRoutes(app, { editDeps, preview, readBody, loadDirection, withDirection });
  registerReviewRoutes(app, { editDeps, preview, canvas, readBody, loadDirection, withDirection });

  const library = createPackLibrary(packs);
  registerPackRoutes(app, {
    library,
    editDeps: { bus, projects, versions, runner },
    readBody,
    withDirection,
    onDeleted: async (packId) => {
      for (const project of await projects.list()) if (project.designSystemFor === packId && !project.designSystemDeleted) await projects.markDesignSystemDeleted(project.id);
    },
  });

  const startDraftImprove = async (projectId: string): Promise<DraftImproveStart> => {
    const main = projects.mainDirection(await projects.get(projectId));
    return withDirection(projectId, main.id, async (project, direction) => {
      if (runner.isRunning(project.id, direction.id)) return { state: 'skipped', reason: 'Another run was in progress, so the AI step did not start. Use Improve with AI.' };
      const level = project.settings.defaultLevel === 'wireframe' ? 'prototype' : project.settings.defaultLevel;
      const request: RunRequest = { prompt: 'Improve this design system.', mode: 'edit', task: 'design-system', level };
      return { state: 'started', runId: await startRun(project, direction, await withTaskInputs(project, direction, request)) };
    });
  };

  const withMain = async <T>(projectId: string, task: (project: Project, direction: Direction) => Promise<T>): Promise<T> => withDirection(projectId, projects.mainDirection(await projects.get(projectId)).id, task);

  const liveDrafts = createLiveDrafts({
    library,
    projectDir: (projectId) => projects.projectDir(projectId),
    getProject: (projectId) => projects.get(projectId),
    mainDirection: (project) => projects.mainDirection(project),
    fetcher: createFetcher(config.fetchAllowLoopback === true),
    emit: (project, sources) => bus.emit({ type: 'design-system.sources', projectId: project.id, directionId: projects.mainDirection(project).id, sources }),
    withMain,
    commit: (project, title) =>
      withMain(project.id, async (current, direction) => {
        await commitInit(current, title, 'manual');
        await emitStatus(current, direction);
      }),
    startImprove: startDraftImprove,
    saveAttachment: (projectId, file) => projects.saveAttachment(projectId, file),
  });

  registerDesignSystemRoutes(app, {
    live: liveDrafts,
    library,
    projects,
    versions,
    projectsFolder: () => defaultFolder.ensure(),
    finishCreate: (project, pack) => applyPackOnCreate(project, pack, undefined),
    watch: watchDirection,
    readBody,
    allowLoopback: config.fetchAllowLoopback === true,
  });

  registerHomeRoutes(app, {
    config,
    projects,
    versions,
    library: createProjectLibrary({ config, projects, versions, preview, runner, defaultFolder: () => defaultFolder.ensure() }),
    thumbnails,
    defaultFolder,
    readBody,
    commitInit,
    watch: (project) => watchDirection(project, projects.mainDirection(project)),
    addParentFolder,
  });

  registerVersionRoutes(app, { projects, versions, thumbnails, names: versionNames, readBody });

  registerEditHistoryRoutes(app, { history: editHistory, editDeps, projects, withDirection, readBody, loadDirection, onRestored: (workTree, relatives) => {
    invalidateTokenSource(workTree);
    if (relatives.includes(CANVAS_FILE)) void announceCanvasAt(workTree);
  } });
  registerCanvasRoutes(app, { projects, canvas, readBody });

  registerVariationRoutes(app, { config, projects, runner, startRun, withDirection, forkDirection, edit: editDeps });
  const mcpRoutes = registerMcpRoutes(app, { projects, versions, preview, runner, canvas, bus, dataDir: config.dataDir, studioToken: config.studioToken, projectsFolder: () => defaultFolder.ensure(), appOpen: () => openStreams > 0, history: editHistory });
  registerShipRoutes(app, { projects, runner, dataDir: config.dataDir, activity: mcpRoutes.activity, readBody });

  app.all('/api/*', (c) => c.json({ error: 'not found' }, 404));

  app.get('*', async (c) => {
    const served = await serveStatic(uiDir, c.req.path);
    if (served) return served;
    const html = await renderIndexHtml(uiDir, config);
    return c.html(html);
  });

  return app;
}
