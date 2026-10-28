import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { customAlphabet, nanoid } from 'nanoid';
import { DEFAULT_SETTINGS, LEGACY_DEFAULT_BUDGET_USD, SETTINGS_VERSION } from '../../shared/contracts.js';
import type { AttachAppRequest, AttachedApp, Attachment, Direction, Project, ProjectKind, ProjectSettings, ProjectThumbnail } from '../../shared/contracts.js';
import type { ProjectStore, ServerConfig, VersionStore } from '../types.js';
import { BadRequestError, ConflictError, NotFoundError, PickAppError, assertSafeId, isNodeError } from './errors.js';
import { cleanAppDir, detectApp, frameworkOf } from '../app/detect.js';
import { MAX_SLUG_SUFFIX, slugCandidate, slugify } from '../../shared/folders.js';
import { createKeyedMutex } from './mutex.js';
import { packagedResource, resourcePath } from '../resources.js';
import { DESIGN_MD_FILE, writeFileAtomic } from '../design-system/packs.js';

const MAIN_DIRECTION_ID = 'main';
const DEFAULT_TEMPLATE_DIR = resourcePath(
  path.join('templates', 'react-vite'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'react-vite'),
);
const PREBUILT_TEMPLATE_DIR = 'react-template';

const directionId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
};

const ATTACHMENT_IMAGE_TYPES: Record<string, string[]> = {
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
};

export interface StudioProjectStore extends ProjectStore {
  directionOf(project: Project, directionId: string): Direction;
  mainDirection(project: Project): Direction;
  updateSettings(projectId: string, patch: Partial<ProjectSettings>): Promise<Project>;
  setPackId(projectId: string, packId: string | null): Promise<Project>;
  markDesignSystemDeleted(projectId: string): Promise<Project>;
  createInFolder(input: { parentPath: string; name: string; kind: ProjectKind; settings?: Partial<ProjectSettings>; designSystemFor?: string }): Promise<Project>;
  isHidden(project: Project): boolean;
  moveIntoFolder(projectId: string, parentPath: string): Promise<Project>;
  discardCreated(projectId: string): Promise<void>;
  rename(projectId: string, name: string): Promise<Project>;
  setThumbnail(projectId: string, thumbnail: ProjectThumbnail): Promise<void>;
  withLock<T>(projectId: string, task: () => Promise<T>): Promise<T>;
  linkModules(workTree: string, sourceModules: string): Promise<void>;
  reserveFolder(parentPath: string, name: string): Promise<string>;
  writeRaw(project: Project): Promise<void>;
  attachApp(input: AttachAppRequest): Promise<Project>;
}

const ENV_KEY = /^[A-Z_][A-Z0-9_]{0,63}$/;
const BLOCKED_ENV_KEY = /^(STUDIO_|ANTHROPIC_|CLAUDE_|NODE_OPTIONS$|PATH$|HOME$)/;
const MAX_ENV_KEYS = 64;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function cleanAppUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new BadRequestError('url must be a full http URL, for example http://localhost:3000');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new BadRequestError('url must use http or https');
  if (!LOOPBACK_HOSTS.has(url.hostname)) throw new BadRequestError('url must point at a dev server on this computer (localhost or 127.0.0.1)');
  if (url.username || url.password) throw new BadRequestError('url must not hold a user name or password');
  return url.origin;
}

function cleanAppEnv(raw: unknown): Record<string, string> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestError('env must be an object of strings');
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > MAX_ENV_KEYS) throw new BadRequestError(`env takes at most ${MAX_ENV_KEYS} keys`);
  const env: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!ENV_KEY.test(key) || BLOCKED_ENV_KEY.test(key)) throw new BadRequestError(`env key ${key} is not allowed`);
    if (typeof value !== 'string' || value.length > 4000 || value.includes('\0')) throw new BadRequestError(`env ${key} must be a short string`);
    env[key] = value;
  }
  return env;
}

function migrateSettings(project: Pick<Project, 'settings' | 'settingsVersion'>): ProjectSettings {
  const settings = { ...DEFAULT_SETTINGS, ...project.settings };
  if ((project.settingsVersion ?? 1) < SETTINGS_VERSION && settings.maxBudgetUsd === LEGACY_DEFAULT_BUDGET_USD) settings.maxBudgetUsd = null;
  return settings;
}

function attachmentProblem(name: string, mime: string): string | null {
  const allowed = ATTACHMENT_IMAGE_TYPES[mime.toLowerCase()];
  const extension = path.extname(name).slice(1).toLowerCase();
  const message = `Attachments must be PNG, JPEG, GIF or WebP images. "${name || 'file'}" (${mime || 'unknown type'}) is not allowed.`;
  if (!allowed) return message;
  if (extension !== '' && !Object.values(ATTACHMENT_IMAGE_TYPES).flat().includes(extension)) return message;
  return null;
}

interface ProjectStoreOptions {
  templateDir?: string;
  installTemplateDeps?: (cacheDir: string) => Promise<void>;
}

function runNpmInstall(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['install', '--no-audit', '--no-fund'],
      { cwd, maxBuffer: 64 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) reject(new Error(`npm install failed in ${cwd}: ${stderr.trim() || error.message}`));
        else resolve();
      },
    );
  });
}

async function copyPrebuiltModules(prebuilt: string, cacheDir: string): Promise<void> {
  await rm(path.join(cacheDir, 'node_modules'), { recursive: true, force: true });
  await cp(path.join(prebuilt, 'node_modules'), path.join(cacheDir, 'node_modules'), { recursive: true, verbatimSymlinks: true });
}

async function prebuiltMatches(prebuilt: string, cacheDir: string): Promise<boolean> {
  if (!existsSync(path.join(prebuilt, 'node_modules'))) return false;
  const [wanted, shipped] = await Promise.all([readFile(path.join(cacheDir, 'package.json'), 'utf8'), readFile(path.join(prebuilt, 'package.json'), 'utf8')]);
  return wanted === shipped;
}

async function installTemplateModules(cacheDir: string): Promise<void> {
  const prebuilt = packagedResource(PREBUILT_TEMPLATE_DIR);
  if (prebuilt && (await prebuiltMatches(prebuilt, cacheDir))) return copyPrebuiltModules(prebuilt, cacheDir);
  return runNpmInstall(cacheDir);
}

function extensionFor(name: string, mime: string): string {
  const fromName = path.extname(name).slice(1).toLowerCase();
  if (/^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  return MIME_EXTENSIONS[mime] ?? 'bin';
}

async function linkNodeModules(workTree: string, sourceModules: string): Promise<void> {
  const real = await realpath(sourceModules);
  const link = path.join(workTree, 'node_modules');
  if (existsSync(link)) return;
  await symlink(real, link, 'dir');
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8')) as unknown;
}

function hasViteDependency(pkg: unknown): boolean {
  if (typeof pkg !== 'object' || pkg === null) return false;
  const record = pkg as Record<string, unknown>;
  return ['dependencies', 'devDependencies', 'peerDependencies'].some((field) => {
    const deps = record[field];
    return typeof deps === 'object' && deps !== null && 'vite' in deps;
  });
}

async function pickAppDir(folder: string, requested: string | undefined): Promise<string> {
  let appDir: string | null;
  if (typeof requested === 'string' && requested.trim() !== '') {
    appDir = cleanAppDir(requested);
    if (appDir === null) throw new BadRequestError('appDir must be a folder inside the attached folder');
  } else {
    const detection = await detectApp(folder);
    if (detection.appDir === null && detection.candidates.length > 1) throw new PickAppError(detection.candidates);
    appDir = detection.framework === 'next' ? detection.appDir : null;
  }
  if (appDir === null) throw new BadRequestError('no Next.js app found: the folder or one of its apps/* folders needs a package.json with a next dependency and an app/ folder');
  const appRoot = await realpath(path.join(folder, appDir)).catch(() => null);
  if (!appRoot || (appRoot !== folder && !appRoot.startsWith(folder + path.sep))) throw new BadRequestError(`appDir ${appDir} is not a folder inside ${folder}`);
  const pkg = (await readJson(path.join(appRoot, 'package.json')).catch(() => null)) as Record<string, unknown> | null;
  if (frameworkOf(pkg) !== 'next') throw new BadRequestError(`${appDir} has no next dependency in its package.json`);
  return appDir;
}

export function createProjectStore(
  config: ServerConfig,
  versions: VersionStore,
  options: ProjectStoreOptions = {},
): StudioProjectStore {
  const lock = createKeyedMutex();
  const templateDir = options.templateDir ?? DEFAULT_TEMPLATE_DIR;
  const installDeps = options.installTemplateDeps ?? installTemplateModules;
  const projectsRoot = path.join(config.dataDir, 'projects');
  const templateCacheDir = path.join(config.dataDir, 'cache', 'react-template');
  let templateInstall: Promise<string> | null = null;

  const projectDir = (projectId: string): string => path.join(projectsRoot, assertSafeId(projectId, 'projectId'));
  const projectFile = (projectId: string): string => path.join(projectDir(projectId), 'project.json');
  const attachmentsDir = (projectId: string): string => path.join(projectDir(projectId), 'attachments');

  const ensureTemplateModules = (): Promise<string> => {
    templateInstall ??= (async () => {
      const modules = path.join(templateCacheDir, 'node_modules');
      const marker = path.join(templateCacheDir, '.studio-installed');
      const pkg = await readFile(path.join(templateDir, 'package.json'), 'utf8');
      const installedFor = existsSync(marker) ? await readFile(marker, 'utf8') : null;
      if (installedFor === pkg && existsSync(modules)) return modules;
      await mkdir(templateCacheDir, { recursive: true });
      await writeFile(path.join(templateCacheDir, 'package.json'), pkg);
      await installDeps(templateCacheDir);
      await mkdir(modules, { recursive: true });
      await writeFile(marker, pkg);
      return modules;
    })().catch((error: unknown) => {
      templateInstall = null;
      throw error;
    });
    return templateInstall;
  };

  const readProject = async (projectId: string): Promise<Project> => {
    try {
      const project = (await readJson(projectFile(projectId))) as Project;
      project.settings = migrateSettings(project);
      return project;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') throw new NotFoundError(`project ${projectId} not found`);
      throw error;
    }
  };

  const writeProject = async (project: Project): Promise<void> => {
    project.settingsVersion = SETTINGS_VERSION;
    await mkdir(projectDir(project.id), { recursive: true });
    await writeFileAtomic(projectFile(project.id), `${JSON.stringify(project, null, 2)}\n`);
  };

  const directionOf = (project: Project, id: string): Direction => {
    const direction = project.directions.find((candidate) => candidate.id === id);
    if (!direction) throw new NotFoundError(`direction ${id} not found in project ${project.id}`);
    return direction;
  };

  const mainDirection = (project: Project): Direction => {
    const direction = project.directions.find((candidate) => candidate.id === MAIN_DIRECTION_ID) ?? project.directions[0];
    if (!direction) throw new NotFoundError(`project ${project.id} has no directions`);
    return direction;
  };

  const newDirection = (id: string, name: string, workTree: string, now: number): Direction => ({
    id,
    name,
    workTree,
    branch: `d/${id}`,
    headVersionId: null,
    parentVersionId: null,
    sessionId: null,
    createdAt: now,
  });

  const newProject = (id: string, name: string, kind: ProjectKind, main: Direction, now: number): Project => ({
    id,
    name,
    kind,
    createdAt: now,
    updatedAt: now,
    imported: null,
    entry: 'index.html',
    settings: { ...DEFAULT_SETTINGS },
    settingsVersion: SETTINGS_VERSION,
    directions: [main],
  });

  const resolveUserFolder = async (sourcePath: string): Promise<string> => {
    if (typeof sourcePath !== 'string' || sourcePath.trim() === '') throw new BadRequestError('path is required');
    if (sourcePath.includes('\0')) throw new BadRequestError('invalid path');
    let folder: string;
    try {
      folder = await realpath(path.resolve(sourcePath));
    } catch {
      throw new BadRequestError(`folder not found: ${sourcePath}`);
    }
    if (!(await stat(folder)).isDirectory()) throw new BadRequestError(`not a folder: ${folder}`);
    if (isInsideDataDir(folder)) throw new BadRequestError('cannot use a folder inside the studio data dir');
    return folder;
  };

  const isInsideDataDir = (folder: string): boolean => {
    const dataRoot = path.resolve(config.dataDir);
    return folder === dataRoot || folder.startsWith(dataRoot + path.sep);
  };

  const makeNewSubfolder = async (parent: string, slug: string): Promise<string> => {
    for (let attempt = 1; attempt <= MAX_SLUG_SUFFIX; attempt += 1) {
      const candidate = path.join(parent, slugCandidate(slug, attempt));
      if (path.dirname(candidate) !== parent) throw new BadRequestError('invalid project folder name');
      try {
        await mkdir(candidate);
        return candidate;
      } catch (error) {
        if (isNodeError(error) && error.code === 'EEXIST') continue;
        throw error;
      }
    }
    throw new ConflictError(`no free folder name for ${slug} in ${parent}`);
  };

  const registerFolder = async (folder: string, input: { name: string; kind: ProjectKind; created: boolean; settings?: Partial<ProjectSettings>; designSystemFor?: string }): Promise<Project> => {
    const id = nanoid(10);
    const now = Date.now();
    const project = newProject(id, input.name, input.kind, newDirection(MAIN_DIRECTION_ID, 'Main', folder, now), now);
    project.imported = input.created ? { sourcePath: folder, created: true } : { sourcePath: folder };
    project.settings = { ...project.settings, ...input.settings };
    if (input.designSystemFor) project.designSystemFor = input.designSystemFor;
    await mkdir(attachmentsDir(id), { recursive: true });
    await writeProject(project);
    return project;
  };

  const updateApp = (projectId: string, app: AttachedApp, keepEnv: boolean): Promise<Project> =>
    lock(projectId, async () => {
      const project = await readProject(projectId);
      project.app = keepEnv && project.app?.env ? { ...app, env: project.app.env } : app;
      project.updatedAt = Date.now();
      await writeProject(project);
      return project;
    });

  return {
    projectDir,
    directionOf,
    mainDirection,

    async list(): Promise<Project[]> {
      if (!existsSync(projectsRoot)) return [];
      const entries = await readdir(projectsRoot, { withFileTypes: true });
      const projects: Project[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || !existsSync(path.join(projectsRoot, entry.name, 'project.json'))) continue;
        try {
          projects.push(await readProject(entry.name));
        } catch (error) {
          console.error(`[projects] cannot read project ${entry.name}`, error);
        }
      }
      return projects.sort((a, b) => b.updatedAt - a.updatedAt);
    },

    get: readProject,

    async create(input: { name: string; kind: ProjectKind; settings?: Partial<ProjectSettings> }): Promise<Project> {
      if (input.kind !== 'html' && input.kind !== 'react') throw new BadRequestError('kind must be html or react');
      const id = nanoid(10);
      const now = Date.now();
      const workTree = path.join(projectDir(id), 'directions', MAIN_DIRECTION_ID);
      const project = newProject(id, input.name.trim() || 'Untitled', input.kind, newDirection(MAIN_DIRECTION_ID, 'Main', workTree, now), now);
      project.settings = { ...project.settings, ...input.settings };
      try {
        await mkdir(workTree, { recursive: true });
        await mkdir(attachmentsDir(id), { recursive: true });
        if (input.kind === 'react') {
          await cp(templateDir, workTree, { recursive: true });
          await linkNodeModules(workTree, await ensureTemplateModules());
        }
        await writeProject(project);
      } catch (error) {
        await rm(projectDir(id), { recursive: true, force: true });
        throw error;
      }
      return project;
    },

    async attachApp(input: AttachAppRequest): Promise<Project> {
      if (typeof input.folder !== 'string' || input.folder.trim() === '') throw new BadRequestError('folder is required: the app code must be on this computer so routes and click-to-source can read it');
      const folder = await resolveUserFolder(input.folder);
      const url = typeof input.url === 'string' && input.url.trim() !== '' ? cleanAppUrl(input.url) : undefined;
      const env = cleanAppEnv(input.env);
      const appDir = await pickAppDir(folder, input.appDir);
      const app: AttachedApp = { framework: 'next', appDir, mode: url ? 'url' : 'managed', ...(url ? { url } : {}), ...(env ? { env } : {}) };
      const existing = (await this.list()).find((project) => project.app && project.imported?.sourcePath === folder && project.app.appDir === appDir);
      if (existing) return updateApp(existing.id, app, env === undefined);
      const fallbackName = appDir === '.' ? path.basename(folder) : `${path.basename(folder)} ${path.basename(appDir)}`;
      const name = (typeof input.name === 'string' && input.name.trim() !== '' ? input.name.trim() : fallbackName).slice(0, 120);
      const project = await registerFolder(folder, { name, kind: 'react', created: false });
      project.app = app;
      project.entry = '/';
      await writeProject(project);
      return project;
    },

    async importFolder(sourcePath: string, appDir?: string): Promise<Project> {
      const folder = await resolveUserFolder(sourcePath);
      const detection = await detectApp(folder);
      if (appDir || detection.framework === 'next') return this.attachApp({ folder, ...(appDir ? { appDir } : {}) });
      const packageFile = path.join(folder, 'package.json');
      const hasPackage = existsSync(packageFile);
      const isVite = hasPackage && hasViteDependency(await readJson(packageFile).catch(() => null));
      if (!isVite && !existsSync(path.join(folder, 'index.html'))) {
        throw new BadRequestError('folder needs a package.json with a vite dependency or an index.html');
      }
      return registerFolder(folder, { name: path.basename(folder), kind: isVite ? 'react' : 'html', created: false });
    },

    async createInFolder(input: { parentPath: string; name: string; kind: ProjectKind; settings?: Partial<ProjectSettings>; designSystemFor?: string }): Promise<Project> {
      if (input.kind !== 'html' && input.kind !== 'react') throw new BadRequestError('kind must be html or react');
      if (typeof input.parentPath !== 'string' || !path.isAbsolute(input.parentPath)) throw new BadRequestError('parentPath must be an absolute path');
      const parent = await resolveUserFolder(input.parentPath);
      const name = input.name.trim() || 'Untitled';
      const folder = await makeNewSubfolder(parent, slugify(name));
      let project: Project | null = null;
      try {
        if (input.kind === 'react') {
          await cp(templateDir, folder, { recursive: true });
          await linkNodeModules(folder, await ensureTemplateModules());
        }
        project = await registerFolder(folder, { name, kind: input.kind, created: true, settings: input.settings, designSystemFor: input.designSystemFor });
        return project;
      } catch (error) {
        await rm(folder, { recursive: true, force: true });
        if (project) await rm(projectDir(project.id), { recursive: true, force: true });
        throw error;
      }
    },

    isHidden(project: Project): boolean {
      return project.imported === null && isInsideDataDir(path.resolve(mainDirection(project).workTree));
    },

    async discardCreated(projectId: string): Promise<void> {
      await lock(projectId, async () => {
        const project = await readProject(projectId);
        const folder = project.imported?.created ? project.imported.sourcePath : null;
        if (folder) await rm(folder, { recursive: true, force: true });
        await rm(projectDir(projectId), { recursive: true, force: true });
      });
    },

    async moveIntoFolder(projectId: string, parentPath: string): Promise<Project> {
      if (typeof parentPath !== 'string' || !path.isAbsolute(parentPath)) throw new BadRequestError('parentPath must be an absolute path');
      const parent = await resolveUserFolder(parentPath);
      return lock(projectId, async () => {
        const project = await readProject(projectId);
        const main = mainDirection(project);
        const from = main.workTree;
        if (project.imported !== null || !isInsideDataDir(path.resolve(from))) throw new BadRequestError(`project ${projectId} is not in the hidden folder`);
        const folder = await makeNewSubfolder(parent, slugify(project.name));
        try {
          await cp(from, folder, { recursive: true, verbatimSymlinks: true, force: false, preserveTimestamps: true });
          const moved: Direction = { ...main, workTree: folder, sessionId: null, sessionCostUsd: 0, sessionResetReason: 'move' };
          project.directions = project.directions.map((direction) => (direction.id === main.id ? moved : direction));
          project.imported = { sourcePath: folder, created: true };
          await writeProject(project);
        } catch (error) {
          await rm(folder, { recursive: true, force: true });
          throw error;
        }
        await rm(from, { recursive: true, force: true }).catch((error: unknown) => console.error(`[projects] moved ${projectId} but could not remove ${from}`, error));
        return project;
      });
    },

    save(project: Project): Promise<void> {
      return lock(project.id, async () => {
        project.updatedAt = Date.now();
        await writeProject(project);
      });
    },

    async addDirection(projectId: string, input: { name: string; fromVersionId: string | null }): Promise<Direction> {
      const project = await readProject(projectId);
      if (project.app) throw new BadRequestError('An attached app has one direction: the app folder itself. Directions and variations copy the folder, so they are off for attached apps.');
      const id = directionId();
      const workTree = path.join(projectDir(projectId), 'directions', id);
      const direction = newDirection(id, input.name.trim() || `Direction ${project.directions.length + 1}`, workTree, Date.now());
      let source = mainDirection(project);
      const fromVersionId = input.fromVersionId ?? source.headVersionId;
      try {
        await mkdir(workTree, { recursive: true });
        if (fromVersionId) {
          const version = await versions.get(project, fromVersionId);
          source = project.directions.find((candidate) => candidate.id === version.directionId) ?? source;
          await versions.checkoutInto(project, version.id, workTree);
          direction.parentVersionId = version.id;
        }
        if (project.kind === 'react') {
          const sourceModules = path.join(source.workTree, 'node_modules');
          if (existsSync(sourceModules)) await linkNodeModules(workTree, sourceModules);
        }
      } catch (error) {
        await rm(workTree, { recursive: true, force: true });
        throw error;
      }
      return lock(projectId, async () => {
        const latest = await readProject(projectId);
        latest.directions.push(direction);
        latest.updatedAt = Date.now();
        await writeProject(latest);
        return direction;
      });
    },

    updateDirection(projectId: string, id: string, patch: Partial<Direction>): Promise<Direction> {
      return lock(projectId, async () => {
        const project = await readProject(projectId);
        const index = project.directions.findIndex((candidate) => candidate.id === id);
        const current = project.directions[index];
        if (index < 0 || current === undefined) throw new NotFoundError(`direction ${id} not found`);
        const updated: Direction = { ...current, ...patch, id: current.id, workTree: current.workTree, branch: current.branch };
        project.directions[index] = updated;
        project.updatedAt = Date.now();
        await writeProject(project);
        return updated;
      });
    },

    updateSettings(projectId: string, patch: Partial<ProjectSettings>): Promise<Project> {
      return lock(projectId, async () => {
        const project = await readProject(projectId);
        project.settings = { ...project.settings, ...patch };
        project.updatedAt = Date.now();
        await writeProject(project);
        return project;
      });
    },

    rename(projectId: string, name: string): Promise<Project> {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (trimmed === '') throw new BadRequestError('name is required');
      if (trimmed.length > 120) throw new BadRequestError('name must be 120 characters or less');
      return lock(projectId, async () => {
        const project = await readProject(projectId);
        project.name = trimmed;
        project.updatedAt = Date.now();
        await writeProject(project);
        return project;
      });
    },

    setThumbnail(projectId: string, thumbnail: ProjectThumbnail): Promise<void> {
      return lock(projectId, async () => {
        if (!existsSync(projectFile(projectId))) return;
        const project = await readProject(projectId);
        project.thumbnail = thumbnail;
        await writeProject(project);
      });
    },

    withLock: (projectId, task) => lock(projectId, task),

    linkModules: linkNodeModules,

    async reserveFolder(parentPath: string, name: string): Promise<string> {
      return makeNewSubfolder(await resolveUserFolder(parentPath), slugify(name));
    },

    writeRaw: (project) => writeProject(project),

    markDesignSystemDeleted(projectId: string): Promise<Project> {
      return lock(projectId, async () => {
        const project = await readProject(projectId);
        project.designSystemDeleted = true;
        project.updatedAt = Date.now();
        await writeProject(project);
        return project;
      });
    },

    setPackId(projectId: string, packId: string | null): Promise<Project> {
      return lock(projectId, async () => {
        const project = await readProject(projectId);
        project.packId = packId;
        project.updatedAt = Date.now();
        await writeProject(project);
        return project;
      });
    },

    async saveAttachment(projectId: string, file: { name: string; mime: string; bytes: Uint8Array }): Promise<Attachment> {
      const problem = attachmentProblem(file.name, file.mime);
      if (problem) throw new BadRequestError(problem);
      await readProject(projectId);
      const id = nanoid(12);
      const dir = attachmentsDir(projectId);
      await mkdir(dir, { recursive: true });
      const filePath = path.join(dir, `${id}.${extensionFor(file.name, file.mime)}`);
      await writeFile(filePath, file.bytes);
      const attachment: Attachment = { id, name: path.basename(file.name || id), mime: file.mime || 'application/octet-stream', path: filePath };
      await writeFileAtomic(path.join(dir, `${id}.json`), JSON.stringify(attachment));
      return attachment;
    },

    async getAttachment(projectId: string, attachmentId: string): Promise<Attachment> {
      const file = path.join(attachmentsDir(projectId), `${assertSafeId(attachmentId, 'attachmentId')}.json`);
      try {
        return (await readJson(file)) as Attachment;
      } catch (error) {
        if (isNodeError(error) && error.code === 'ENOENT') throw new NotFoundError(`attachment ${attachmentId} not found`);
        throw error;
      }
    },

    async readDesignMd(projectId: string): Promise<string | null> {
      const project = await readProject(projectId);
      try {
        return await readFile(path.join(mainDirection(project).workTree, DESIGN_MD_FILE), 'utf8');
      } catch (error) {
        if (isNodeError(error) && error.code === 'ENOENT') return null;
        throw error;
      }
    },

    async writeDesignMd(projectId: string, content: string): Promise<void> {
      const project = await readProject(projectId);
      await writeFileAtomic(path.join(mainDirection(project).workTree, DESIGN_MD_FILE), content);
    },
  };
}
